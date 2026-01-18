# services/email_monitor/gmail_client.py
from __future__ import annotations
import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from core.security import encryption

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
]

def build_gmail_service_from_user(user: dict):
    tokens = user.get("googleTokens") or {}
    enc_access = tokens.get("accessToken")
    enc_refresh = tokens.get("refreshToken")

    if not enc_refresh:
        raise ValueError("Missing refresh token for user")

    access_token = encryption.decrypt(enc_access) if enc_access else None
    refresh_token = encryption.decrypt(enc_refresh)

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        scopes=GMAIL_SCOPES,
    )

    return build("gmail", "v1", credentials=creds)
