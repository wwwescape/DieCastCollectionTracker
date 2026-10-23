def test_healthz_reports_ok(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_responses_carry_security_headers(client):
    response = client.get("/healthz")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    csp = response.headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in csp and "script-src 'self'" in csp


def test_api_docs_are_hidden_outside_development(monkeypatch):
    import importlib

    import app.main
    from app.core import config

    monkeypatch.setenv("ENVIRONMENT", "production")
    config.get_settings.cache_clear()
    try:
        production_app = importlib.reload(app.main).app
        assert production_app.docs_url is None
        assert production_app.openapi_url is None
    finally:
        monkeypatch.delenv("ENVIRONMENT")
        config.get_settings.cache_clear()
        importlib.reload(app.main)
