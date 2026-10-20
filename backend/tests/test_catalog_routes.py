import io

import pytest
from PIL import Image

from app.core.config import UPLOADS_DIR
from app.services import wiki_catalog

# Same shape as a real casting page's rendered "Versions" table: header row of <th>, a
# rowspan carrying color/toy #/photo across two releases, <br>-split series cells, a lazy-load
# placeholder <img> whose real thumbnail is in data-src, and a footnote <sup>.
VERSIONS_HTML = """
<aside class="portable-infobox"><table><tr><td>not a versions table</td></tr></table></aside>
<table class="wikitable sortable"><tbody>
<tr><th><b>Col #</b></th><th><b>Year</b></th><th><b>Series</b></th><th><b>Color</b></th>
<th><b>Tampo</b></th><th><b>Toy #</b></th><th><b>Notes</b></th><th><b>Photo</b></th></tr>
<tr><td>007/214</td><td><a href="/wiki/List">2010</a></td><td><a>2010 HW Premiere</a><br />7/52</td>
<td rowspan="2">Metalflake Grey</td><td rowspan="2">Nissan logo</td><td rowspan="2">R0922</td>
<td rowspan="2">Base code(s): C16<sup>[1]</sup></td>
<td rowspan="2"><span><a
 href="https://static.wikia.nocookie.net/hotwheels/images/7/79/Grey.JPG/revision/latest"
 class="mw-file-description image"><img src="data:image/gif;base64,R0lGOD"
 data-src="https://static.wikia.nocookie.net/hotwheels/images/7/79/Grey.JPG/revision/latest/scale-to-width-down/75"
 /></a></span></td></tr>
<tr><td>007/240</td><td>2010</td><td>2010 New Models<br />7/44</td></tr>
<tr><td>N/A</td><td>2017</td><td>Promotional</td><td>Red</td><td>Race tampos</td>
<td>DJV34 (USA)<br />DMH12 (ROW)</td><td></td>
<td><a href="https://static.wikia.nocookie.net/hotwheels/images/0/00/Image_Not_Available.jpg"
 class="image"><img src="x" /></a></td></tr>
</tbody></table>
"""


@pytest.fixture(autouse=True)
def _fresh_cache():
    wiki_catalog.clear_cache()
    yield
    wiki_catalog.clear_cache()


@pytest.fixture()
def fake_wiki(monkeypatch):
    calls: list[tuple[str, dict]] = []

    def _fake_get_json(source, params):
        calls.append((source.id, params))
        if params["action"] == "parse":
            if params["page"] == "Missing":
                raise wiki_catalog.NotFoundError("Casting page not found")
            return {"parse": {"title": params["page"], "text": VERSIONS_HTML}}
        if params.get("generator") == "search":
            return {
                "query": {
                    "pages": [
                        {"title": f"List of 2010 {source.label}", "index": 1},
                        {
                            "title": f"{source.manufacturer} Skyline",
                            "index": 2,
                            "templates": [{"ns": 10, "title": "Template:Casting"}],
                            "thumbnail": {"source": f"https://static.wikia.nocookie.net/{source.id}/thumb.jpg"},
                        },
                    ]
                }
            }
        return {"query": {"pages": [{"title": params["titles"], "original": {"source": "https://img/main.jpg"}}]}}

    monkeypatch.setattr(wiki_catalog, "_get_json", _fake_get_json)
    return calls


def test_parse_versions_expands_rowspans_and_maps_columns():
    versions = wiki_catalog.parse_versions(VERSIONS_HTML)

    assert len(versions) == 3
    first, second, promo = versions
    assert (first.collector_number, first.year, first.series, first.series_number) == (
        "007/214",
        2010,
        "2010 HW Premiere",
        "7/52",
    )
    assert first.color == "Metalflake Grey"
    assert first.toy_numbers == ["R0922"]
    assert first.notes == "Base code(s): C16"
    assert first.photo_url == "https://static.wikia.nocookie.net/hotwheels/images/7/79/Grey.JPG/revision/latest"
    assert first.thumbnail_url.endswith("scale-to-width-down/75")
    # Second row inherits the rowspanned cells
    assert (second.collector_number, second.series, second.series_number) == ("007/240", "2010 New Models", "7/44")
    assert second.color == "Metalflake Grey"
    assert second.toy_numbers == ["R0922"]
    assert second.photo_url == first.photo_url
    # N/A and placeholder images become empty
    assert promo.collector_number is None
    assert promo.toy_numbers == ["DJV34", "DMH12"]
    assert promo.photo_url is None


def test_catalog_requires_auth(client):
    assert client.get("/api/catalog/search", params={"q": "skyline"}).status_code == 401


def test_list_sources(auth_client):
    response = auth_client.get("/api/catalog/sources")

    assert response.status_code == 200
    assert [s["manufacturer"] for s in response.json()] == ["Hot Wheels", "Matchbox"]


def test_search_keeps_only_casting_pages_and_interleaves_sources(auth_client, fake_wiki):
    response = auth_client.get("/api/catalog/search", params={"q": "Skyline"})

    assert response.status_code == 200
    body = response.json()
    assert [(r["source"], r["title"]) for r in body] == [
        ("hotwheels", "Hot Wheels Skyline"),
        ("matchbox", "Matchbox Skyline"),
    ]
    assert body[0]["url"] == "https://hotwheels.fandom.com/wiki/Hot_Wheels_Skyline"
    assert body[0]["thumbnailUrl"].endswith("/thumb.jpg")


def test_search_single_source_and_cache(auth_client, fake_wiki):
    auth_client.get("/api/catalog/search", params={"q": "Skyline", "source": "matchbox"})
    auth_client.get("/api/catalog/search", params={"q": "skyline", "source": "matchbox"})

    assert [source for source, _ in fake_wiki] == ["matchbox"]


def test_search_reports_502_when_wiki_unreachable(auth_client, monkeypatch):
    def _down(source, params):
        raise wiki_catalog.CatalogUnavailableError("Hot Wheels Wiki is unreachable right now")

    monkeypatch.setattr(wiki_catalog, "_get_json", _down)

    response = auth_client.get("/api/catalog/search", params={"q": "Skyline", "source": "hotwheels"})

    assert response.status_code == 502
    assert "unreachable" in response.json()["detail"]


def test_get_casting(auth_client, fake_wiki):
    response = auth_client.get("/api/catalog/casting", params={"source": "hotwheels", "title": "Nissan Skyline"})

    assert response.status_code == 200
    body = response.json()
    assert body["manufacturer"] == "Hot Wheels"
    assert body["imageUrl"] == "https://img/main.jpg"
    assert len(body["versions"]) == 3
    assert body["versions"][0]["toyNumbers"] == ["R0922"]


def test_get_casting_missing_page_is_404(auth_client, fake_wiki):
    response = auth_client.get("/api/catalog/casting", params={"source": "hotwheels", "title": "Missing"})

    assert response.status_code == 404


def test_search_requires_three_characters_after_trimming(auth_client, fake_wiki):
    for query in ["ab", "  ab  ", "   "]:
        response = auth_client.get("/api/catalog/search", params={"q": query})
        assert response.status_code == 422, query


def test_get_casting_rejects_unknown_source(auth_client):
    response = auth_client.get("/api/catalog/casting", params={"source": "majorette", "title": "X"})

    assert response.status_code == 422


def test_car_keeps_catalog_link(auth_client):
    response = auth_client.post(
        "/api/cars",
        json={
            "name": "Nissan Skyline GT-R (BNR34)",
            "manufacturer": "Hot Wheels",
            "catalogSource": "hotwheels",
            "catalogTitle": "Nissan Skyline GT-R (BNR34)",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["catalogSource"] == "hotwheels"
    assert body["catalogUrl"] == "https://hotwheels.fandom.com/wiki/Nissan_Skyline_GT-R_(BNR34)"

    cleared = auth_client.patch(f"/api/cars/{body['id']}", json={"catalogSource": None, "catalogTitle": None})
    assert cleared.json()["catalogUrl"] is None


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (60, 40), color="green").save(buf, format="PNG")
    return buf.getvalue()


def test_import_photo_from_wiki_rejects_other_hosts(auth_client):
    response = auth_client.post("/api/uploads/car-images/from-wiki", json={"url": "http://169.254.169.254/latest"})

    assert response.status_code == 400


def test_import_photo_from_wiki_saves_image(auth_client, monkeypatch):
    seen: list[str] = []

    def _fake_download(url, max_bytes):
        seen.append(url)
        return _png_bytes()

    monkeypatch.setattr(wiki_catalog, "download_image", _fake_download)
    wiki_url = "https://static.wikia.nocookie.net/hotwheels/images/7/79/Grey.JPG/revision/latest"

    response = auth_client.post("/api/uploads/car-images/from-wiki", json={"url": wiki_url})

    assert response.status_code == 201
    assert seen == [wiki_url]
    saved_path = UPLOADS_DIR / "car-images" / response.json()["url"].removeprefix("/uploads/car-images/")
    assert saved_path.is_file()
    saved_path.unlink()


def test_import_car_photo_from_wiki_adds_to_gallery(auth_client, monkeypatch):
    monkeypatch.setattr(wiki_catalog, "download_image", lambda url, max_bytes: _png_bytes())
    car_id = auth_client.post("/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels"}).json()["id"]

    response = auth_client.post(
        f"/api/cars/{car_id}/photos/from-wiki",
        json={"url": "https://static.wikia.nocookie.net/hotwheels/images/a.jpg"},
    )

    assert response.status_code == 201
    assert response.json()["isPrimary"] is True
    car = auth_client.get(f"/api/cars/{car_id}").json()
    assert len(car["photos"]) == 1
    (UPLOADS_DIR / "car-images" / car["photo"].removeprefix("/uploads/car-images/")).unlink()


def test_is_wiki_image_url():
    assert wiki_catalog.is_wiki_image_url("https://static.wikia.nocookie.net/matchbox/images/a.jpg")
    assert not wiki_catalog.is_wiki_image_url("http://static.wikia.nocookie.net/matchbox/images/a.jpg")
    assert not wiki_catalog.is_wiki_image_url("https://static.wikia.nocookie.net.evil.com/a.jpg")
    assert not wiki_catalog.is_wiki_image_url("https://static.wikia.nocookie.net:8443/a.jpg")
