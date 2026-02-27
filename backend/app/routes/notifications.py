from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.firebase import get_current_user_uid
from app.models.user import User
from app.services.notifications import notification_service
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class RegisterTokenRequest(BaseModel):
    fcm_token: str
    device_id: Optional[str] = None


class UnregisterTokenRequest(BaseModel):
    fcm_token: str


class TestNotificationRequest(BaseModel):
    title: str = "Test Notification"
    body: str = "This is a test notification"


#------This Function registers FCM token---------
@router.post("/register")
async def register_fcm_token(
    body: RegisterTokenRequest, uid: str = Depends(get_current_user_uid)
):
    user = await User.find_one(User.firebase_uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    
    if body.fcm_token not in user.fcm_tokens:
        user.fcm_tokens.append(body.fcm_token)
        user.updated_at = datetime.utcnow()
        await user.save()
        logger.info(f"Registered FCM token for user {uid}")
        return {"status": "registered", "message": "FCM token registered successfully"}
    else:
        logger.info(f"FCM token already registered for user {uid}")
        return {"status": "already_registered", "message": "FCM token already exists"}


#------This Function unregisters FCM token---------
@router.post("/unregister")
async def unregister_fcm_token(
    body: UnregisterTokenRequest, uid: str = Depends(get_current_user_uid)
):
    user = await User.find_one(User.firebase_uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.fcm_token in user.fcm_tokens:
        user.fcm_tokens.remove(body.fcm_token)
        user.updated_at = datetime.utcnow()
        await user.save()
        logger.info(f"Unregistered FCM token for user {uid}")
        return {
            "status": "unregistered",
            "message": "FCM token removed successfully",
        }
    else:
        return {"status": "not_found", "message": "FCM token not found"}


#------This Function sends test notification---------
@router.post("/test")
async def send_test_notification(
    body: TestNotificationRequest, uid: str = Depends(get_current_user_uid)
):
    count = await notification_service.send_notification_to_user(
        user_uid=uid,
        title=body.title,
        body=body.body,
        data={"type": "test"},
    )

    if count > 0:
        return {
            "status": "sent",
            "message": f"Test notification sent to {count} device(s)",
        }
    else:
        raise HTTPException(
            status_code=404,
            detail="No FCM tokens found for user or all tokens are invalid",
        )


#------This Function gets registered tokens---------
@router.get("/tokens")
async def get_registered_tokens(uid: str = Depends(get_current_user_uid)):
    user = await User.find_one(User.firebase_uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "tokens": user.fcm_tokens,
        "count": len(user.fcm_tokens),
    }
