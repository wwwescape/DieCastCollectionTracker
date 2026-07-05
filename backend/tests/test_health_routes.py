def test_healthz_reports_ok(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
