import io

import pytest
from PIL import Image

from app.core.config import UPLOADS_DIR
from app.services import car_service, upload_service, wiki_catalog

# Same shape as a real pack page: intro naming the toy number in brackets plus an alternate
# one, then a "Cars" table whose Casting Name links to each car's casting page (one of them
# a red link to a page that doesn't exist yet).
PACK_HTML = """
<p>The <b>Formula One 10-Pack</b> (JMM24) was released in 2026. Some packs use JGF58 instead.</p>
<table class="wikitable sortable"><tbody>
<tr><th>Casting Name</th><th>Body Color</th><th>Tampo</th><th>Photo</th></tr>
<tr><td><a href="/wiki/Formula_1_(2025)" title="Formula 1 (2025)">McLaren Formula 1 Team</a></td>
<td><i>Anthracite</i></td><td>McLaren livery</td>
<td><a href="https://static.wikia.nocookie.net/hotwheels/images/a/aa/McLaren.jpg/revision/latest"
 class="mw-file-description image"><img src="data:image/gif;base64,R0lGOD"
 data-src="https://static.wikia.nocookie.net/hotwheels/images/a/aa/McLaren.jpg/revision/latest/scale-to-width-down/100"
 /></a></td></tr>
<tr><td><a href="/wiki/Formula_1_(2025)" title="Formula 1 (2025)">Scuderia Ferrari HP</a></td>
<td><i>Rosso Corsa</i></td><td>Ferrari livery</td><td></td></tr>
<tr><td><a href="/wiki/Future_Car?action=edit" class="new" title="Future Car (page does not exist)">Future Car</a></td>
<td>White</td><td></td><td></td></tr>
</tbody></table>
"""


@pytest.fixture(autouse=True)
def _fresh_cache():
    wiki_catalog.clear_cache()
    yield
    wiki_catalog.clear_cache()


@pytest.fixture()
def fake_wiki(monkeypatch):
    def _fake_get_json(source, params):
        if params["action"] == "parse":
            if params["page"] == "Nissan Skyline":
                return {"parse": {"title": "Nissan Skyline", "text": "", "categories": [{"category": "Cars"}]}}
            return {
                "parse": {
                    "title": params["page"],
                    "text": PACK_HTML,
                    "wikitext": "",
                    "categories": [{"category": "2026_Hot_Wheels"}, {"category": "10-Packs"}],
                }
            }
        if params.get("generator") == "search":
            return {
                "query": {
                    "pages": [
                        {
                            "title": "Formula 1 (2025)",
                            "index": 2,
                            "templates": [{"ns": 10, "title": "Template:Casting"}],
                            "categories": [{"title": "Category:Multipack Exclusive"}],
                        },
                        {
                            "title": "Formula One 10-Pack",
                            "index": 1,
                            "categories": [{"title": "Category:10-Packs"}, {"title": "Category:2026 Hot Wheels"}],
                        },
                        {"title": "List of 2026 5-Packs", "index": 3, "categories": [{"title": "Category:5-Packs"}]},
                        {"title": "Downtown Garage", "index": 4, "categories": [{"title": "Category:Playsets"}]},
                    ]
                }
            }
        return {"query": {"pages": [{"title": params["titles"], "original": {"source": "https://img/pack.jpg"}}]}}

    monkeypatch.setattr(wiki_catalog, "_get_json", _fake_get_json)


@pytest.mark.parametrize(
    ("title", "categories", "label"),
    [
        ("Formula One 10-Pack", ["Category:10-Packs"], "10-Pack"),
        ("Batman 5-Pack (2026)", ["5-Packs", "2026_5-Packs"], "5-Pack"),
        ("Japanese Car Culture Themed Multipack (2026)", ["6-Packs", "Multi-Packs"], "6-Pack"),
        ("Ferrari 80th Anniversary Collection", ["Multi-Packs"], "Multipack"),
        ("Classic 5 Car Gift Pak", ["Gift Pack"], "5-Pack"),
        ("Holiday Racers Gift Set", ["Gift Pack"], "Gift Pack"),
        ("Nissan Skyline", ["Cars"], None),
        ("Mega Garage", ["Playsets", "Gift Pack"], None),
        ("List of 2026 5-Packs", ["5-Packs", "Lists"], None),
    ],
)
def test_pack_label_from_categories(title, categories, label):
    assert wiki_catalog.pack_label_from_categories(title, categories) == label


def test_search_lists_packs_alongside_castings(auth_client, fake_wiki):
    response = auth_client.get("/api/catalog/search", params={"q": "JMM24", "source": "hotwheels"})

    assert response.status_code == 200
    assert [(r["kind"], r["title"], r["packLabel"]) for r in response.json()] == [
        ("pack", "Formula One 10-Pack", "10-Pack"),
        ("casting", "Formula 1 (2025)", None),
    ]


def test_get_pack(auth_client, fake_wiki):
    response = auth_client.get("/api/catalog/pack", params={"source": "hotwheels", "title": "Formula One 10-Pack"})

    assert response.status_code == 200
    body = response.json()
    assert body["packLabel"] == "10-Pack"
    assert body["toyNumbers"] == ["JMM24", "JGF58"]
    assert body["year"] == 2026
    assert body["imageUrl"] == "https://img/pack.jpg"
    assert [(c["name"], c["castingTitle"], c["color"]) for c in body["cars"]] == [
        ("McLaren Formula 1 Team", "Formula 1 (2025)", "Anthracite"),
        ("Scuderia Ferrari HP", "Formula 1 (2025)", "Rosso Corsa"),
        ("Future Car", None, "White"),
    ]
    assert body["cars"][0]["photoUrl"].endswith("/McLaren.jpg/revision/latest")
    assert body["cars"][1]["photoUrl"] is None


def test_get_pack_rejects_non_pack_pages_and_matchbox(auth_client, fake_wiki):
    not_pack = auth_client.get("/api/catalog/pack", params={"source": "hotwheels", "title": "Nissan Skyline"})
    matchbox = auth_client.get("/api/catalog/pack", params={"source": "matchbox", "title": "Anything"})

    assert not_pack.status_code == 404
    assert matchbox.status_code == 404


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (60, 40), color="green").save(buf, format="PNG")
    return buf.getvalue()


def _pack_car(name: str, **extra) -> dict:
    return {
        "name": name,
        "manufacturer": "Hot Wheels",
        "series": "Formula One 10-Pack",
        "castNumber": "JMM24",
        "year": 2026,
        "catalogSource": "hotwheels",
        "catalogTitle": "Formula 1 (2025)",
        **extra,
    }


def test_bulk_create_adds_every_car_and_copies_wiki_photos(auth_client, monkeypatch):
    def _fake_download(url, max_bytes):
        if "broken" in url:
            raise wiki_catalog.CatalogUnavailableError("Couldn't download the wiki image")
        return _png_bytes()

    monkeypatch.setattr(wiki_catalog, "download_image", _fake_download)

    response = auth_client.post(
        "/api/cars/bulk",
        json={
            "cars": [
                _pack_car(
                    "McLaren Formula 1 Team", color="Anthracite", wikiPhotoUrl="https://static.wikia.nocookie.net/a.jpg"
                ),
                _pack_car(
                    "Scuderia Ferrari HP",
                    status="wishlist",
                    wikiPhotoUrl="https://static.wikia.nocookie.net/broken.jpg",
                ),
            ]
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["photosFailed"] == 1
    assert [(c["name"], c["status"], c["seriesName"], c["castNumber"]) for c in body["cars"]] == [
        ("McLaren Formula 1 Team", "owned", "Formula One 10-Pack", "JMM24"),
        ("Scuderia Ferrari HP", "wishlist", "Formula One 10-Pack", "JMM24"),
    ]
    assert body["cars"][0]["photo"].startswith("/uploads/car-images/")
    assert body["cars"][1]["photo"] is None
    assert len(auth_client.get("/api/cars").json()) == 2
    (UPLOADS_DIR / "car-images" / body["cars"][0]["photo"].removeprefix("/uploads/car-images/")).unlink()


def test_bulk_create_is_all_or_nothing(auth_client, monkeypatch):
    saved: list[str] = []
    monkeypatch.setattr(wiki_catalog, "download_image", lambda url, max_bytes: _png_bytes())

    original_save = upload_service.save_car_image

    def _tracking_save(source):
        url = original_save(source)
        saved.append(url)
        return url

    monkeypatch.setattr(upload_service, "save_car_image", _tracking_save)

    original_add = car_service._add_car

    def _fail_on_second(db, **fields):
        if fields["name"] == "Second":
            raise RuntimeError("boom")
        return original_add(db, **fields)

    monkeypatch.setattr(car_service, "_add_car", _fail_on_second)

    with pytest.raises(RuntimeError):
        auth_client.post(
            "/api/cars/bulk",
            json={
                "cars": [
                    _pack_car("First", wikiPhotoUrl="https://static.wikia.nocookie.net/a.jpg"),
                    _pack_car("Second"),
                ]
            },
        )

    assert auth_client.get("/api/cars").json() == []
    assert saved and not any(
        (UPLOADS_DIR / "car-images" / url.removeprefix("/uploads/car-images/")).exists() for url in saved
    )


def test_bulk_create_validates_batch_size(auth_client):
    assert auth_client.post("/api/cars/bulk", json={"cars": []}).status_code == 422
    assert (
        auth_client.post("/api/cars/bulk", json={"cars": [_pack_car(f"Car {i}") for i in range(51)]}).status_code == 422
    )
