"""
VaultRAG v4 — JWT Authentication
=================================
Real JWT issue and verify using PyJWT (HS256).

Users:
    dave   / agent123   / support_agent
    erin   / super123   / supervisor
    frank  / admin123   / admin

Signing secret is read from JWT_SECRET env var.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

# ---------------------------------------------------------------------------
# User database (demo users matching notebook 01 seed data)
# ---------------------------------------------------------------------------
USERS = {
    "dave": {"password": "agent123", "role": "support_agent", "user_id": "dave"},
    "erin": {"password": "super123", "role": "supervisor", "user_id": "erin"},
    "frank": {"password": "admin123", "role": "admin", "user_id": "frank"},
}


def _get_secret() -> str:
    return os.getenv("JWT_SECRET", "dev-secret-change-me")


def issue_token(username: str, password: str) -> Optional[str]:
    """Authenticate credentials and return a signed JWT.

    Returns None if username is unknown or password is wrong.
    Token expires after 24 hours.
    """
    user = USERS.get(username)
    if not user or user["password"] != password:
        return None

    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "role": user["role"],
        "user_id": user["user_id"],
        "iat": now,
        "exp": now + timedelta(hours=24),
    }
    return jwt.encode(payload, _get_secret(), algorithm="HS256")


def verify_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT. Returns the claims dict on success.

    Returns None on any failure: expired, tampered, malformed, missing fields.
    Never trusts the caller — only verified claims are returned.
    """
    try:
        claims = jwt.decode(token, _get_secret(), algorithms=["HS256"])
        # Ensure required fields are present
        if not all(k in claims for k in ("sub", "role", "user_id")):
            return None
        return claims
    except (jwt.ExpiredSignatureError, jwt.InvalidSignatureError,
            jwt.DecodeError, jwt.InvalidTokenError, KeyError):
        return None
