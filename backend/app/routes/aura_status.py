from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.core.firebase import get_current_user_uid
from app.core.database import get_aura_modules_db
from app.db.aura_modules import AuraModulesDB
from app.models.user import User
from app.utils.access_control import check_patient_access

router = APIRouter(prefix="/aura", tags=["aura"])


#------This Function gets Aura status---------
@router.get("/status")
async def get_aura_status(
    patient_uid: Optional[str] = None,
    uid: str = Depends(get_current_user_uid),
    aura_modules_db: AuraModulesDB = Depends(get_aura_modules_db),
):
    requester = await User.find_one(User.firebase_uid == uid)
    if not requester:
        raise HTTPException(status_code=404, detail="User not found")

    target_uid = patient_uid
    if not target_uid:
        if requester.role.value == "caregiver" and requester.linked_patients:
            target_uid = requester.linked_patients[0]
        else:
            target_uid = uid

    has_access = await check_patient_access(uid, target_uid)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    module = await aura_modules_db.get_module(target_uid)
    if not module:
        return {
            "connected": False,
            "patient_uid": target_uid,
            "message": "No Aura module registered",
            "features": [],
        }

    last_seen = module.get("last_seen")
    if hasattr(last_seen, "isoformat"):
        last_seen = last_seen.isoformat()

    return {
        "connected": module.get("status") == "online",
        "patient_uid": target_uid,
        "ip": module.get("ip"),
        "port": module.get("port"),
        "status": module.get("status"),
        "last_seen": last_seen,
        "features": ["camera", "microphone", "face_recognition"],
    }
