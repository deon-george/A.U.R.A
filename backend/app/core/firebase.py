import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
import os

_bearer = HTTPBearer()
_app = None


#------This Function initializes Firebase---------
def init_firebase():
    global _app
    if _app:
        return
    cred_path = settings.firebase_credentials_path
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        _app = firebase_admin.initialize_app(cred)
    else:
        _app = firebase_admin.initialize_app()


#------This Function gets the current user UID from token---------
async def get_current_user_uid(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    try:
        decoded = firebase_auth.verify_id_token(creds.credentials)
        return decoded["uid"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
