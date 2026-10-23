from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.rate_limit import Throttled, password_throttle
from app.models.system import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    SetupRequest,
    SetupStatusResponse,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service
from app.services.auth_service import AuthError, WrongPasswordError

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _guard(key: str) -> None:
    """Refuses a password check once `key` has failed too often (app/core/rate_limit.py)."""
    try:
        password_throttle.check(key)
    except Throttled as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
            headers={"Retry-After": str(exc.retry_after)},
        ) from exc


def _client_key(request: Request) -> str:
    # Per client address. Behind a reverse proxy every request shares the proxy's address
    # unless uvicorn trusts its X-Forwarded-For (see README → Reverse proxy).
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    key = f"login:{_client_key(request)}"
    _guard(key)
    try:
        user = auth_service.authenticate_user(db, body.username, body.password)
    except AuthError as exc:
        password_throttle.fail(key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    password_throttle.succeed(key)

    access_token, refresh_token = auth_service.issue_tokens(db, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/setup-status", response_model=SetupStatusResponse)
def setup_status(db: Session = Depends(get_db)) -> SetupStatusResponse:
    return SetupStatusResponse(setup_required=db.query(User).count() == 0)


@router.post("/setup", response_model=TokenResponse)
def setup(body: SetupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Creates the very first admin account from the web UI, so a fresh instance doesn't
    require `docker compose exec app python -m scripts.create_admin`. Deliberately not a
    general-purpose register endpoint - create_initial_admin rejects this once any user
    already exists (see app/services/auth_service.py), and that rejection surfaces as a 409
    via the app-wide ConflictError handler in app/main.py."""
    user = auth_service.create_initial_admin(db, body.username, body.password)
    access_token, refresh_token = auth_service.issue_tokens(db, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        access_token, refresh_token = auth_service.rotate_refresh_token(db, body.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: RefreshRequest, db: Session = Depends(get_db)) -> None:
    auth_service.revoke_refresh_token(db, body.refresh_token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=current_user.id, username=current_user.username)


@router.post("/change-password", response_model=TokenResponse)
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Changes the signed-in user's password. Every existing session is signed out (their
    refresh tokens revoked); this one gets fresh tokens so it stays signed in."""
    # A stolen session shouldn't be able to guess the current password either.
    key = f"password:{current_user.id}"
    _guard(key)
    try:
        auth_service.change_password(db, current_user, body.current_password, body.new_password)
    except WrongPasswordError as exc:
        password_throttle.fail(key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    password_throttle.succeed(key)

    access_token, refresh_token = auth_service.issue_tokens(db, current_user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
