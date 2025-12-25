from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests
import os

SECRET_KEY = "supersecretkeywhichshouldbechanged"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_google_token(token: str):
    # DEV BYPASS: Allow mock tokens for local testing
    if token.startswith("mock_"):
        suffix = token.replace("mock_", "")
        return {
            "email": f"mock_user_{suffix}@example.com",
            "sub": f"mock_social_id_{suffix}",
            "iss": "https://accounts.google.com",
            "name": f"Mock User {suffix}",
            "picture": "https://example.com/avatar.jpg"
        }
    try:
        # verifying the token with Google
        # This AUTOMATICALLY checks:
        # 1. Signature (Integrity)
        # 2. Aud (Audience) == GOOGLE_CLIENT_ID (Prevents Confused Deputy)
        # 3. Exp (Expiration) (Prevents Replay)
        id_info = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        
        # Explicitly verify the issuer to prevent spoofing
        if id_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        return id_info # Contains email, sub (social_id), name, picture
    except ValueError as e:
        # Log this error in production!
        return None
