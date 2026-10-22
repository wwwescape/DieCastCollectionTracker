import pytest

from app.services import wiki_catalog

# Shaped like a rendered playset page: toy number in brackets in the intro, a table of the
# included cars keyed by "Casting Name", and a rowspanned casting/color carried across a
# variant row.
SET_HTML = """
<p>The <b>Downtown Fire Station Spinout (GJL14)</b> is a Hot Wheels City playset released in 2020.</p>
<table class="wikitable sortable"><tbody>
<tr><th><b>Casting Name</b></th><th><b>Color</b></th><th><b>Tampo</b></th><th><b>Photo</b></th></tr>
<tr><td><a>Fire Truck</a></td><td>Red</td><td>"Fire Dept"</td>
<td><a href="https://static.wikia.nocookie.net/hotwheels/images/a/a1/FireTruck.jpg/revision/latest"
 class="mw-file-description image"><img
 data-src="https://static.wikia.nocookie.net/hotwheels/images/a/a1/FireTruck.jpg/revision/latest/scale-to-width-down/75"
 /></a></td></tr>
<tr><td rowspan="2"><a>Rescue Duty</a></td><td rowspan="2">Yellow</td><td>Black stripes</td>
<td></td></tr>
<tr><td>White stripes</td><td></td></tr>
</tbody></table>
"""


def _page(title, *categories, casting=False, pageid=None, index=0):
    page = {"title": title, "index": index, "pageid": pageid or abs(hash(title)) % 10_000}
    if categories:
        page["categories"] = [{"ns": 14, "title": f"Category:{category}"} for category in categories]
    if casting:
        page["templates"] = [{"ns": 10, "title": "Template:Casting"}]
    return page


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
            return {
                "parse": {
                    "title": params["page"],
                    "text": SET_HTML,
                    "categories": [
                        {"category": "2020_Hot_Wheels"},
                        {"category": "Playsets"},
                        {"category": "Hidden_maintenance", "hidden": True},
                    ],
                }
            }
        if params.get("generator") == "search":
            # First batch arrives with categories for only some pages; the rest follow in a
            # "clcontinue" round, like the real API does for large result sets.
            if "clcontinue" not in params:
                return {
                    "continue": {"clcontinue": "2|Playsets", "continue": "||"},
                    "query": {
                        "pages": [
                            _page("1977 Track Sets", "Track Sets", pageid=1, index=1),
                            _page("Downtown Fire Station Spinout", pageid=2, index=2),
                            _page("Fire Truck", "Hot Wheels City", casting=True, pageid=3, index=3),
                            _page("Swamp Beast Track Set", "Track Sets", casting=True, pageid=4, index=4),
                            _page("City 5-Pack (2020)", "Hot Wheels City", "5-Packs", pageid=5, index=5),
                            _page("Stunt Tracks", "Tracksets", pageid=6, index=6),
                            _page("Track sets", "Track Sets", "Lists", pageid=7, index=7),
                        ]
                    },
                }
            return {"query": {"pages": [_page("Downtown Fire Station Spinout", "Playsets", pageid=2, index=2)]}}
        return {"query": {"pages": [{"title": params["titles"], "original": {"source": "https://img/set.jpg"}}]}}

    monkeypatch.setattr(wiki_catalog, "_get_json", _fake_get_json)
    return calls


def test_set_type_from_categories():
    assert wiki_catalog.set_type_from_categories("X", ["Category:Playsets"]) == "playset"
    assert wiki_catalog.set_type_from_categories("X", ["City_Sets"]) == "playset"
    assert wiki_catalog.set_type_from_categories("X", ["Track_Sets", "2005_Hot_Wheels"]) == "track_set"
    assert wiki_catalog.set_type_from_categories("X", ["Category:Tracksets"]) == "track_set"
    assert wiki_catalog.set_type_from_categories("X", ["Category:Lists", "Category:Track Sets"]) is None
    # Multi-packs and gift packs aren't sets: their cars are tracked one by one.
    assert wiki_catalog.set_type_from_categories("X", ["Category:5-Packs"]) is None
    assert wiki_catalog.set_type_from_categories("Funny Car Gift Pack", ["Category:3-Packs"]) is None


def test_parse_set_cars_dedupes_rowspanned_variants():
    cars = wiki_catalog.parse_set_cars(SET_HTML)

    assert [(car.name, car.color) for car in cars] == [("Fire Truck", "Red"), ("Rescue Duty", "Yellow")]
    assert cars[0].photo_url.endswith("FireTruck.jpg/revision/latest")
    assert cars[0].thumbnail_url.endswith("scale-to-width-down/75")
    assert cars[1].photo_url is None


def test_search_sets_keeps_playsets_and_track_sets_only(auth_client, fake_wiki):
    response = auth_client.get("/api/catalog/sets/search", params={"q": "fire station"})

    assert response.status_code == 200
    assert [(r["title"], r["setType"]) for r in response.json()] == [
        ("Downtown Fire Station Spinout", "playset"),
        ("Swamp Beast Track Set", "track_set"),
        ("Stunt Tracks", "track_set"),
    ]
    # Only the Hot Wheels Wiki is searched for sets, and the categories batch was completed.
    assert {source for source, _ in fake_wiki} == {"hotwheels"}
    assert sum(1 for _, params in fake_wiki if "clcontinue" in params) == 1


def test_car_search_leaves_out_track_sets(auth_client, fake_wiki):
    response = auth_client.get("/api/catalog/search", params={"q": "fire station", "source": "hotwheels"})

    # Multi-packs are offered alongside castings (as kind "pack"); boxed sets never are.
    assert sorted((r["kind"], r["title"]) for r in response.json()) == [
        ("casting", "Fire Truck"),
        ("pack", "City 5-Pack (2020)"),
    ]


def test_set_search_requires_three_characters(auth_client, fake_wiki):
    assert auth_client.get("/api/catalog/sets/search", params={"q": " ab "}).status_code == 422


def test_get_set_reads_toy_number_year_and_cars(auth_client, fake_wiki):
    response = auth_client.get(
        "/api/catalog/set", params={"source": "hotwheels", "title": "Downtown Fire Station Spinout"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["setType"] == "playset"
    assert body["toyNumber"] == "GJL14"
    assert body["year"] == 2020
    assert body["imageUrl"] == "https://img/set.jpg"
    assert body["manufacturer"] == "Hot Wheels"
    assert [car["name"] for car in body["cars"]] == ["Fire Truck", "Rescue Duty"]


def test_get_set_is_hot_wheels_only(auth_client, fake_wiki):
    response = auth_client.get("/api/catalog/set", params={"source": "matchbox", "title": "Some Playset"})

    assert response.status_code == 404


PLAYSET_WIKITEXT = """{{casting|name=Downtown Fire Station Spinout|series=[[Hot Wheels City]]|number=FMY96|years=2018}}

==Description==
A small playset with a fire station shaped like a firefighter's helmet.

== Car(s) included ==
*2018: [[Backdrafter]]
*2020: [[HW Pursuit]] and [[File:Pursuit.jpg|75px]]
*[[Backdrafter]]
[[Category:Playsets]]
"""


def test_get_set_reads_the_casting_infobox_and_included_cars_list(auth_client, monkeypatch):
    def _fake_get_json(source, params):
        if params["action"] == "parse":
            return {
                "parse": {
                    "title": params["page"],
                    "text": "<p>A small playset.</p>",
                    "wikitext": PLAYSET_WIKITEXT,
                    "categories": [{"category": "Playsets"}, {"category": "2020_Hot_Wheels"}],
                }
            }
        placeholder = "https://static.wikia.nocookie.net/hotwheels/images/0/00/Image_Not_Available.jpg"
        return {"query": {"pages": [{"title": params["titles"], "original": {"source": placeholder}}]}}

    monkeypatch.setattr(wiki_catalog, "_get_json", _fake_get_json)

    body = auth_client.get(
        "/api/catalog/set", params={"source": "hotwheels", "title": "Downtown Fire Station Spinout"}
    ).json()

    assert body["toyNumber"] == "FMY96"
    # The infobox year wins over the category one.
    assert body["year"] == 2018
    assert body["imageUrl"] is None
    assert [(car["name"], car["color"]) for car in body["cars"]] == [("Backdrafter", None), ("HW Pursuit", None)]
