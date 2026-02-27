import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
from app.core.firebase import get_current_user_uid
from app.models.user import User, UserRole
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


MAX_DISPLAY_NAME_LENGTH = 100
MAX_PHOTO_URL_LENGTH = 500


class RegisterRequest(BaseModel):
    email: str
    display_name: str = ""
    photo_url: str = ""

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Email cannot be empty')
        
        v = v.strip().lower()
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError('Invalid email format')
        if len(v) > 255:
            raise ValueError('Email cannot exceed 255 characters')
        return v

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        if v and len(v) > MAX_DISPLAY_NAME_LENGTH:
            raise ValueError(f'Display name cannot exceed {MAX_DISPLAY_NAME_LENGTH} characters')
        return v.strip() if v else ""

    @field_validator('photo_url')
    @classmethod
    def validate_photo_url(cls, v: str) -> str:
        if v and len(v) > MAX_PHOTO_URL_LENGTH:
            raise ValueError(f'Photo URL cannot exceed {MAX_PHOTO_URL_LENGTH} characters')
        
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError('Photo URL must start with http:// or https://')
        return v.strip() if v else ""


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    photo_url: Optional[str] = None

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) > MAX_DISPLAY_NAME_LENGTH:
                raise ValueError(f'Display name cannot exceed {MAX_DISPLAY_NAME_LENGTH} characters')
            return v.strip()
        return v

    @field_validator('photo_url')
    @classmethod
    def validate_photo_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) > MAX_PHOTO_URL_LENGTH:
                raise ValueError(f'Photo URL cannot exceed {MAX_PHOTO_URL_LENGTH} characters')
            if v and not v.startswith(('http://', 'https://')):
                raise ValueError('Photo URL must start with http:// or https://')
            return v.strip()
        return v


class UserResponse(BaseModel):
    id: str
    firebase_uid: str
    email: str
    display_name: str
    photo_url: str
    role: str
    is_onboarded: bool
    is_banned: bool


#------This Function registers a user---------
@router.post("/register", response_model=UserResponse)
async def register(body: RegisterRequest, uid: str = Depends(get_current_user_uid)):
    try:
        existing = await User.find_one(User.firebase_uid == uid)
        if existing:
            if existing.is_banned:
                logger.warning(f"Banned user attempted registration: {uid}")
                raise HTTPException(status_code=403, detail="Account banned")
            return _to_response(existing)

        caregiver_check = await User.find({"caregiver_emails": body.email}).to_list()
        role = UserRole.PATIENT
        linked = []
        if caregiver_check:
            role = UserRole.CAREGIVER
            linked = [u.firebase_uid for u in caregiver_check]

        user = User(
            firebase_uid=uid,
            email=body.email,
            display_name=body.display_name,
            photo_url=body.photo_url,
            role=role,
            linked_patients=linked,
        )
        await user.insert()
        logger.info(f"New user registered: {uid} with role {role.value}")
        return _to_response(user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to register user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register user")


#------This Function gets current user---------
@router.get("/me", response_model=UserResponse)
async def get_me(uid: str = Depends(get_current_user_uid)):
    try:
        user = await User.find_one(User.firebase_uid == uid)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.is_banned:
            raise HTTPException(status_code=403, detail="Account banned")
        return _to_response(user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user profile {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user profile")


#------This Function updates profile---------
@router.put("/me", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    uid: str = Depends(get_current_user_uid)
):
    try:
        user = await User.find_one(User.firebase_uid == uid)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.is_banned:
            raise HTTPException(status_code=403, detail="Account banned")
        
        
        if body.display_name is not None:
            user.display_name = body.display_name
        if body.photo_url is not None:
            user.photo_url = body.photo_url
        
        user.updated_at = datetime.utcnow()
        await user.save()
        logger.info(f"Updated profile for user {uid}")
        return _to_response(user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update profile for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


#------This Function converts user to response---------
def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        firebase_uid=user.firebase_uid,
        email=user.email,
        display_name=user.display_name,
        photo_url=user.photo_url,
        role=user.role.value,
        is_onboarded=user.is_onboarded,
        is_banned=user.is_banned,
    )
