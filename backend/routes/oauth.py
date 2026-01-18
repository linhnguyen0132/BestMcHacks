from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from datetime import datetime
import os

from core.database import get_db
from core.security import encryption, generate_token
from core.auth import create_session

router = APIRouter(prefix="/oauth", tags=["oauth"])

# Get OAuth config from environment
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", 
    "http://localhost:8000/oauth/google/callback"
)

if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    raise RuntimeError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required")

# OAuth scopes - what we request from Google
SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    #'https://www.googleapis.com/auth/gmail.readonly',
    #'https://www.googleapis.com/auth/calendar.events'
]

def get_google_flow() -> Flow:
    """Create Google OAuth flow"""
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI]
            }
        },
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI
    )

@router.get("/google")
async def google_oauth_start(request: Request):
    """
    Start Google OAuth flow.
    User clicks "Sign in with Google" → redirects here → redirects to Google
    """
    flow = get_google_flow()
    
    # Generate state token for CSRF protection
    state = generate_token()
    request.session["oauth_state"] = state
    
    # Get authorization URL
    auth_url, _ = flow.authorization_url(
        access_type='offline',  # Get refresh token
        prompt='consent',       # Force consent screen to get refresh token
        state=state
    )
    
    return RedirectResponse(url=auth_url)

@router.get("/google/callback")
async def google_oauth_callback(request: Request, code: str, state: str):
    """
    Handle OAuth callback from Google.
    Google redirects here with authorization code → exchange for tokens → create user
    """
    
    # Verify state token (CSRF protection)
    stored_state = request.session.get("oauth_state")
    if not stored_state or state != stored_state:
        raise HTTPException(status_code=400, detail="Invalid state parameter. Possible CSRF attack.")
    
    # Exchange authorization code for tokens
    flow = get_google_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    # Get user info from Google
    oauth2_service = build('oauth2', 'v2', credentials=credentials)
    user_info = oauth2_service.userinfo().get().execute()
    
    # Encrypt tokens before storing
    encrypted_access = encryption.encrypt(credentials.token)
    encrypted_refresh = encryption.encrypt(credentials.refresh_token)
    
    # Prepare user document
    user_doc = {
        "email": user_info["email"],
        "name": user_info.get("name", ""),
        "picture": user_info.get("picture"),
        "provider": "google",
        "googleTokens": {
            "accessToken": encrypted_access,
            "refreshToken": encrypted_refresh,
            "expiryDate": int(credentials.expiry.timestamp() * 1000) if credentials.expiry else None
        },
        "updatedAt": datetime.utcnow()
    }
    
    # Upsert user (create if not exists, update if exists)
    db = get_db()
    result = await db.users.update_one(
        {"email": user_info["email"]},
        {
            "$set": user_doc,
            "$setOnInsert": {
                "createdAt": datetime.utcnow(),
                "preferences": {
                    "alertDays": [5, 3, 1],
                    "timezone": "UTC"
                }
            }
        },
        upsert=True
    )
    
    # Get user ID
    if result.upserted_id:
        user_id = str(result.upserted_id)
    else:
        user = await db.users.find_one({"email": user_info["email"]})
        user_id = str(user["_id"])
    
    # Create session
    create_session(request, user_id, user_info["email"])
    
    # Redirect to frontend (change this to your frontend URL)
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(url=f"{frontend_url}/dashboard")