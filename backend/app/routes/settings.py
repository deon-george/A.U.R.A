from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.firebase import get_current_user_uid
from app.models.settings import (
    UserSettings,
    NotificationPreferences,
    AppearanceSettings,
    PrivacySettings,
    VoiceSettings,
    AccessibilitySettings,
)
from datetime import datetime

router = APIRouter(prefix="/settings", tags=["settings"])


class UpdateNotificationsRequest(BaseModel):
    enabled: Optional[bool] = None
    medication_reminders: Optional[bool] = None
    sos_alerts: Optional[bool] = None
    geofence_alerts: Optional[bool] = None
    daily_insights: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


class UpdateAppearanceRequest(BaseModel):
    theme: Optional[str] = None
    font_size: Optional[str] = None
    high_contrast: Optional[bool] = None


class UpdatePrivacyRequest(BaseModel):
    location_tracking: Optional[bool] = None
    share_data_with_caregivers: Optional[bool] = None
    anonymous_analytics: Optional[bool] = None


class UpdateVoiceRequest(BaseModel):
    voice_assistant_enabled: Optional[bool] = None
    voice_feedback: Optional[bool] = None
    language: Optional[str] = None
    voice_gender: Optional[str] = None


class UpdateAccessibilityRequest(BaseModel):
    screen_reader: Optional[bool] = None
    large_buttons: Optional[bool] = None
    reduce_motion: Optional[bool] = None


#------This Function gets settings---------
@router.get("/")
async def get_settings(uid: str = Depends(get_current_user_uid)):
    settings = await UserSettings.find_one(UserSettings.user_uid == uid)

    if not settings:
        
        settings = UserSettings(user_uid=uid)
        await settings.insert()

    return {
        "user_uid": settings.user_uid,
        "notifications": settings.notifications.model_dump(),
        "appearance": settings.appearance.model_dump(),
        "privacy": settings.privacy.model_dump(),
        "voice": settings.voice.model_dump(),
        "accessibility": settings.accessibility.model_dump(),
        "updated_at": settings.updated_at.isoformat(),
    }


#------This Function updates notifications---------
@router.patch("/notifications")
async def update_notifications(
    body: UpdateNotificationsRequest, uid: str = Depends(get_current_user_uid)
):
    settings = await UserSettings.find_one(UserSettings.user_uid == uid)

    if not settings:
        settings = UserSettings(user_uid=uid)

    
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings.notifications, key, value)

    settings.updated_at = datetime.utcnow()
    await settings.save()

    return {"status": "updated", "notifications": settings.notifications.model_dump()}


#------This Function updates appearance---------
@router.patch("/appearance")
async def update_appearance(
    body: UpdateAppearanceRequest, uid: str = Depends(get_current_user_uid)
):
    settings = await UserSettings.find_one(UserSettings.user_uid == uid)

    if not settings:
        settings = UserSettings(user_uid=uid)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings.appearance, key, value)

    settings.updated_at = datetime.utcnow()
    await settings.save()

    return {"status": "updated", "appearance": settings.appearance.model_dump()}


#------This Function updates privacy---------
@router.patch("/privacy")
async def update_privacy(
    body: UpdatePrivacyRequest, uid: str = Depends(get_current_user_uid)
):
    settings = await UserSettings.find_one(UserSettings.user_uid == uid)

    if not settings:
        settings = UserSettings(user_uid=uid)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings.privacy, key, value)

    settings.updated_at = datetime.utcnow()
    await settings.save()

    return {"status": "updated", "privacy": settings.privacy.model_dump()}


#------This Function updates voice---------
@router.patch("/voice")
async def update_voice(
    body: UpdateVoiceRequest, uid: str = Depends(get_current_user_uid)
):
    settings = await UserSettings.find_one(UserSettings.user_uid == uid)

    if not settings:
        settings = UserSettings(user_uid=uid)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings.voice, key, value)

    settings.updated_at = datetime.utcnow()
    await settings.save()

    return {"status": "updated", "voice": settings.voice.model_dump()}


#------This Function updates accessibility---------
@router.patch("/accessibility")
async def update_accessibility(
    body: UpdateAccessibilityRequest, uid: str = Depends(get_current_user_uid)
):
    settings = await UserSettings.find_one(UserSettings.user_uid == uid)

    if not settings:
        settings = UserSettings(user_uid=uid)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings.accessibility, key, value)

    settings.updated_at = datetime.utcnow()
    await settings.save()

    return {"status": "updated", "accessibility": settings.accessibility.model_dump()}


#------This Function resets settings---------
@router.delete("/")
async def reset_settings(uid: str = Depends(get_current_user_uid)):
    settings = await UserSettings.find_one(UserSettings.user_uid == uid)

    if settings:
        await settings.delete()

    
    new_settings = UserSettings(user_uid=uid)
    await new_settings.insert()

    return {"status": "reset", "message": "Settings reset to defaults"}
