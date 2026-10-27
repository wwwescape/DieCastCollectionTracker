def test_login_success_returns_tokens(client, test_user):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "correct-password"})

    assert response.status_code == 200
    body = response.json()
    assert body["tokenType"] == "bearer"
    assert body["accessToken"]
    assert body["refreshToken"]


def test_login_wrong_password_rejected(client, test_user):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"})

    assert response.status_code == 401


def test_login_unknown_user_rejected(client, test_user):
    response = client.post("/api/auth/login", json={"username": "nobody", "password": "whatever"})

    assert response.status_code == 401


def test_me_requires_auth(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_returns_current_user_with_valid_access_token(client, test_user):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "correct-password"})
    access_token = login.json()["accessToken"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {access_token}"})

    assert response.status_code == 200
    assert response.json() == {
        "id": test_user.id,
        "username": "admin",
        "currency": None,
        "overviewLayout": None,
    }


def test_me_rejects_garbage_token(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401


def test_refresh_issues_new_tokens(client, test_user):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "correct-password"})
    old_refresh_token = login.json()["refreshToken"]

    response = client.post("/api/auth/refresh", json={"refreshToken": old_refresh_token})

    assert response.status_code == 200
    new_tokens = response.json()
    assert new_tokens["refreshToken"] != old_refresh_token


def test_refresh_token_cannot_be_replayed_after_rotation(client, test_user):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "correct-password"})
    old_refresh_token = login.json()["refreshToken"]

    client.post("/api/auth/refresh", json={"refreshToken": old_refresh_token})
    replay = client.post("/api/auth/refresh", json={"refreshToken": old_refresh_token})

    assert replay.status_code == 401


def test_logout_revokes_refresh_token(client, test_user):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "correct-password"})
    refresh_token = login.json()["refreshToken"]

    logout = client.post("/api/auth/logout", json={"refreshToken": refresh_token})
    assert logout.status_code == 204

    reuse = client.post("/api/auth/refresh", json={"refreshToken": refresh_token})
    assert reuse.status_code == 401


def test_logout_is_idempotent_for_already_revoked_token(client, test_user):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "correct-password"})
    refresh_token = login.json()["refreshToken"]

    first = client.post("/api/auth/logout", json={"refreshToken": refresh_token})
    second = client.post("/api/auth/logout", json={"refreshToken": refresh_token})

    assert first.status_code == 204
    assert second.status_code == 204


def test_access_token_rejected_at_refresh_endpoint(client, test_user):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "correct-password"})
    access_token = login.json()["accessToken"]

    response = client.post("/api/auth/refresh", json={"refreshToken": access_token})

    assert response.status_code == 401


def test_setup_status_reports_required_when_no_users(client):
    response = client.get("/api/auth/setup-status")

    assert response.status_code == 200
    assert response.json() == {"setupRequired": True}


def test_setup_status_reports_not_required_once_a_user_exists(client, test_user):
    response = client.get("/api/auth/setup-status")

    assert response.status_code == 200
    assert response.json() == {"setupRequired": False}


def test_setup_creates_first_user_and_logs_in(client):
    response = client.post("/api/auth/setup", json={"username": "admin", "password": "a-strong-password"})

    assert response.status_code == 200
    body = response.json()
    assert body["tokenType"] == "bearer"
    assert body["accessToken"]
    assert body["refreshToken"]

    assert client.get("/api/auth/setup-status").json() == {"setupRequired": False}

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['accessToken']}"})
    assert me.status_code == 200
    assert me.json()["username"] == "admin"


def test_setup_rejected_once_a_user_already_exists(client, test_user):
    response = client.post("/api/auth/setup", json={"username": "someone-else", "password": "a-strong-password"})

    assert response.status_code == 409


def test_setup_rejects_short_password(client):
    response = client.post("/api/auth/setup", json={"username": "admin", "password": "short"})

    assert response.status_code == 422


def test_setup_rejects_short_username(client):
    response = client.post("/api/auth/setup", json={"username": "ab", "password": "a-strong-password"})

    assert response.status_code == 422


def _login(client, password="correct-password"):
    return client.post("/api/auth/login", json={"username": "admin", "password": password})


def test_change_password_requires_auth(client, test_user):
    response = client.post(
        "/api/auth/change-password",
        json={"currentPassword": "correct-password", "newPassword": "brand-new-password"},
    )

    assert response.status_code == 401


def test_change_password_updates_login_and_returns_fresh_tokens(client, test_user):
    tokens = _login(client).json()

    response = client.post(
        "/api/auth/change-password",
        json={"currentPassword": "correct-password", "newPassword": "brand-new-password"},
        headers={"Authorization": f"Bearer {tokens['accessToken']}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["accessToken"] and body["refreshToken"]
    assert _login(client).status_code == 401
    assert _login(client, "brand-new-password").status_code == 200
    # The session that made the change keeps working with its new refresh token.
    assert client.post("/api/auth/refresh", json={"refreshToken": body["refreshToken"]}).status_code == 200


def test_change_password_signs_out_other_sessions(client, test_user):
    other_session = _login(client).json()
    this_session = _login(client).json()

    client.post(
        "/api/auth/change-password",
        json={"currentPassword": "correct-password", "newPassword": "brand-new-password"},
        headers={"Authorization": f"Bearer {this_session['accessToken']}"},
    )

    refreshed = client.post("/api/auth/refresh", json={"refreshToken": other_session["refreshToken"]})
    assert refreshed.status_code == 401


def test_change_password_rejects_wrong_current_password(client, test_user):
    tokens = _login(client).json()

    response = client.post(
        "/api/auth/change-password",
        json={"currentPassword": "wrong-password", "newPassword": "brand-new-password"},
        headers={"Authorization": f"Bearer {tokens['accessToken']}"},
    )

    # 400, not 401: the user is signed in, so this mustn't look like an expired session.
    assert response.status_code == 400
    assert _login(client).status_code == 200


def test_change_password_rejects_short_new_password(client, test_user):
    tokens = _login(client).json()

    response = client.post(
        "/api/auth/change-password",
        json={"currentPassword": "correct-password", "newPassword": "short"},
        headers={"Authorization": f"Bearer {tokens['accessToken']}"},
    )

    assert response.status_code == 422
    assert _login(client).status_code == 200


def test_login_is_throttled_after_repeated_failures(client, test_user):
    for _ in range(5):
        assert _login(client, "wrong-password").status_code == 401

    blocked = _login(client, "wrong-password")
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0
    # Even the right password waits out the window, so guessing can't continue.
    assert _login(client).status_code == 429


def test_successful_login_clears_earlier_failures(client, test_user):
    for _ in range(4):
        _login(client, "wrong-password")
    assert _login(client).status_code == 200
    for _ in range(4):
        assert _login(client, "wrong-password").status_code == 401
    assert _login(client).status_code == 200


def test_change_password_is_throttled_after_repeated_wrong_current_passwords(client, test_user):
    tokens = _login(client).json()
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    body = {"currentPassword": "wrong-password", "newPassword": "brand-new-password"}

    for _ in range(5):
        assert client.post("/api/auth/change-password", json=body, headers=headers).status_code == 400

    assert client.post("/api/auth/change-password", json=body, headers=headers).status_code == 429


def test_replaying_a_rotated_refresh_token_signs_every_session_out(client, test_user, monkeypatch):
    from app.services import auth_service

    monkeypatch.setattr(auth_service, "REUSE_GRACE_SECONDS", -1)
    original = _login(client).json()["refreshToken"]
    rotated = client.post("/api/auth/refresh", json={"refreshToken": original}).json()["refreshToken"]

    # Someone presents the old token again: refused, and the current one dies with it.
    assert client.post("/api/auth/refresh", json={"refreshToken": original}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refreshToken": rotated}).status_code == 401


def test_replay_within_the_grace_period_does_not_sign_out(client, test_user):
    # Two tabs refreshing with the same token at once: the slower one is refused, nothing more.
    original = _login(client).json()["refreshToken"]
    rotated = client.post("/api/auth/refresh", json={"refreshToken": original}).json()["refreshToken"]

    assert client.post("/api/auth/refresh", json={"refreshToken": original}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refreshToken": rotated}).status_code == 200


def test_a_token_revoked_by_logout_is_not_treated_as_reuse(client, test_user, monkeypatch):
    from app.services import auth_service

    monkeypatch.setattr(auth_service, "REUSE_GRACE_SECONDS", -1)
    logged_out = _login(client).json()["refreshToken"]
    other = _login(client).json()["refreshToken"]
    client.post("/api/auth/logout", json={"refreshToken": logged_out})

    assert client.post("/api/auth/refresh", json={"refreshToken": logged_out}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refreshToken": other}).status_code == 200


def test_currency_is_saved_on_the_account(auth_client):
    assert auth_client.get("/api/auth/me").json()["currency"] is None

    response = auth_client.put("/api/auth/me/preferences", json={"currency": "EUR"})

    assert response.status_code == 200
    assert response.json()["currency"] == "EUR"
    assert auth_client.get("/api/auth/me").json()["currency"] == "EUR"


def test_currency_must_be_a_three_letter_code(auth_client):
    assert auth_client.put("/api/auth/me/preferences", json={"currency": "euro"}).status_code == 422


def test_preferences_require_auth(client):
    assert client.put("/api/auth/me/preferences", json={"currency": "EUR"}).status_code == 401


def test_unknown_username_is_still_checked_against_a_hash(client, monkeypatch):
    from app.services import auth_service

    checked = []
    real_verify = auth_service.verify_password
    monkeypatch.setattr(auth_service, "verify_password", lambda pw, h: checked.append(h) or real_verify(pw, h))

    response = client.post("/api/auth/login", json={"username": "nobody", "password": "whatever"})

    assert response.status_code == 401
    assert checked == [auth_service._DUMMY_PASSWORD_HASH]


def test_setup_rejects_a_password_longer_than_72_bytes(client):
    response = client.post("/api/auth/setup", json={"username": "admin", "password": "é" * 37})

    assert response.status_code == 422


def test_change_password_rejects_a_password_longer_than_72_bytes(auth_client):
    response = auth_client.post(
        "/api/auth/change-password", json={"currentPassword": "correct-password", "newPassword": "x" * 73}
    )

    assert response.status_code == 422


def test_overview_layout_is_saved_on_the_account(auth_client):
    layout = [{"key": "needsAttention", "hidden": False}, {"key": "stats", "hidden": True}]

    response = auth_client.put("/api/auth/me/preferences", json={"overviewLayout": layout})

    assert response.status_code == 200
    assert response.json()["overviewLayout"] == layout
    assert auth_client.get("/api/auth/me").json()["overviewLayout"] == layout


def test_preferences_change_only_what_is_sent(auth_client):
    auth_client.put("/api/auth/me/preferences", json={"currency": "EUR"})
    auth_client.put("/api/auth/me/preferences", json={"overviewLayout": [{"key": "stats", "hidden": True}]})

    me = auth_client.get("/api/auth/me").json()
    assert me["currency"] == "EUR"
    assert me["overviewLayout"] == [{"key": "stats", "hidden": True}]


def test_overview_layout_rejects_bad_keys(auth_client):
    response = auth_client.put("/api/auth/me/preferences", json={"overviewLayout": [{"key": "<script>"}]})

    assert response.status_code == 422
