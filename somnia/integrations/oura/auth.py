"""Oura Ring OAuth 2.0 authentication flow.

Handles authorization URL generation, code exchange, and token refresh.
Tokens expire in 24h; refresh tokens do not expire.
"""

import os
from urllib.parse import urlencode

import requests

OURA_BASE_URL = "https://api.ouraring.com"
OURA_AUTH_URL = "https://cloud.ouraring.com/oauth/authorize"
OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token"

SCOPES = [
    "daily",
    "heartrate",
    "personal",
    "session",
    "workout",
    "tag",
    "email",
]


def get_authorization_url(patient_id: str) -> str:
    """Build the Oura consent screen URL for a patient.

    The patient_id is stored in the OAuth state param so the callback
    can be matched back to the correct patient record.
    """
    params = {
        "response_type": "code",
        "client_id": os.getenv("OURA_CLIENT_ID"),
        "redirect_uri": os.getenv("OURA_REDIRECT_URI"),
        "scope": " ".join(SCOPES),
        "state": patient_id,
    }
    return f"{OURA_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code: str) -> dict:
    """Exchange an authorization code for access + refresh tokens.

    Returns dict with keys: access_token, refresh_token, token_type, expires_in.
    Both tokens should be stored encrypted in DB per patient.
    """
    resp = requests.post(
        OURA_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": os.getenv("OURA_REDIRECT_URI"),
            "client_id": os.getenv("OURA_CLIENT_ID"),
            "client_secret": os.getenv("OURA_CLIENT_SECRET"),
        },
    )
    resp.raise_for_status()
    return resp.json()


def refresh_access_token(refresh_token: str) -> dict:
    """Refresh an expired access token using the refresh token.

    Should be called automatically before any API call if token is stale.
    """
    resp = requests.post(
        OURA_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": os.getenv("OURA_CLIENT_ID"),
            "client_secret": os.getenv("OURA_CLIENT_SECRET"),
        },
    )
    resp.raise_for_status()
    return resp.json()
