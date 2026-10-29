"""Cache-Control and gzip on responses (app/main.py)."""

from app.main import IMMUTABLE_CACHE, cache_control_for


def test_cache_control_by_path():
    assert cache_control_for("/assets/index-abc123.js") == IMMUTABLE_CACHE
    assert cache_control_for("/uploads/car-images/x.jpg") == IMMUTABLE_CACHE
    # Unhashed files are revalidated every time so a new release shows up straight away.
    for path in ("/", "/index.html", "/sw.js", "/collection/vehicles"):
        assert cache_control_for(path) == "no-cache"
    assert cache_control_for("/api/cars") is None
    assert cache_control_for("/healthz") is None


def test_large_json_is_gzipped(auth_client):
    for i in range(30):
        auth_client.post("/api/cars", json={"name": f"Car {i}", "manufacturer": "Hot Wheels"})

    response = auth_client.get("/api/cars", headers={"Accept-Encoding": "gzip"})

    assert response.headers["content-encoding"] == "gzip"
    assert len(response.json()) == 30


def test_vehicle_list_query_count_does_not_grow_with_the_list(auth_client, db_session):
    from sqlalchemy import event

    engine = db_session.get_bind()

    set_id = auth_client.post(
        "/api/sets", json={"name": "Fire Station", "manufacturer": "Hot Wheels", "setType": "playset"}
    ).json()["id"]

    def count_queries() -> int:
        count = 0

        def on_execute(*_):
            nonlocal count
            count += 1

        event.listen(engine, "before_cursor_execute", on_execute)
        try:
            auth_client.get("/api/cars")
        finally:
            event.remove(engine, "before_cursor_execute", on_execute)
        return count

    for i in range(2):
        auth_client.post("/api/cars", json={"name": f"A{i}", "manufacturer": "Hot Wheels", "tags": ["JDM"]})
    few = count_queries()
    for i in range(20):
        auth_client.post(
            "/api/cars",
            json={"name": f"B{i}", "manufacturer": "Hot Wheels", "tags": ["JDM"], "setIds": [set_id]},
        )
    many = count_queries()

    assert many == few
    cars = auth_client.get("/api/cars").json()
    assert {tag["name"] for car in cars for tag in car["tags"]} == {"JDM"}
    assert sum(1 for car in cars if car["sets"]) == 20
