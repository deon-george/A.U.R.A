from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_aura_modules_db
from app.core.firebase import get_current_user_uid
from app.db.aura_modules import AuraModulesDB
from app.models.journal import JournalEntry
from app.models.medication import Medication
from app.models.orito_interaction import OritoInteraction
from app.models.sos import SOSEvent
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["admin"])


#------This Function requires admin role---------
async def require_admin(uid: str = Depends(get_current_user_uid)) -> str:
    user = await User.find_one(User.firebase_uid == uid)
    if not user or user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return uid


#------This Function serializes user data---------
def _serialize_user(u: User) -> dict:
    return {
        "id": str(u.id),
        "firebase_uid": u.firebase_uid,
        "email": u.email,
        "display_name": u.display_name,
        "role": u.role.value,
        "is_banned": u.is_banned,
        "is_onboarded": u.is_onboarded,
        "linked_patients_count": len(u.linked_patients),
        "has_location": bool(u.last_location),
        "created_at": u.created_at.isoformat(),
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
    }


#------This Function lists users---------
@router.get("/users")
async def list_users(
    _: str = Depends(require_admin),
    q: Optional[str] = Query(default=None, max_length=100),
    role: Optional[str] = Query(default=None),
    banned: Optional[bool] = Query(default=None),
    onboarded: Optional[bool] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
):
    query: dict = {}
    if role:
        query["role"] = role
    if banned is not None:
        query["is_banned"] = banned
    if onboarded is not None:
        query["is_onboarded"] = onboarded
    if q:
        text = q.strip()
        query["$or"] = [
            {"email": {"$regex": text, "$options": "i"}},
            {"display_name": {"$regex": text, "$options": "i"}},
            {"firebase_uid": {"$regex": text, "$options": "i"}},
        ]

    users = await User.find(query).sort([("created_at", -1)]).limit(limit).to_list()
    return [_serialize_user(u) for u in users]


#------This Function gets statistics---------
@router.get("/stats")
async def get_stats(
    _: str = Depends(require_admin),
    aura_modules_db: AuraModulesDB = Depends(get_aura_modules_db),
):
    now = datetime.utcnow()
    since_24h = now - timedelta(hours=24)

    total = await User.count()
    patients = await User.find(User.role == "patient").count()
    caregivers = await User.find(User.role == "caregiver").count()
    admins = await User.find(User.role == "admin").count()
    banned = await User.find(User.is_banned == True).count()
    pending_onboarding = await User.find(User.is_onboarded == False).count()
    active_sos = await SOSEvent.find(SOSEvent.resolved == False).count()
    interactions_24h = await OritoInteraction.find(
        OritoInteraction.created_at >= since_24h
    ).count()
    journals_24h = await JournalEntry.find(JournalEntry.created_at >= since_24h).count()

    modules = await aura_modules_db.list_modules(limit=2000)
    online_modules = sum(1 for module in modules if module.get("status") == "online")
    offline_modules = sum(1 for module in modules if module.get("status") != "online")

    return {
        "total_users": total,
        "patients": patients,
        "caregivers": caregivers,
        "admins": admins,
        "banned": banned,
        "pending_onboarding": pending_onboarding,
        "active_sos": active_sos,
        "interactions_24h": interactions_24h,
        "journals_24h": journals_24h,
        "online_aura_modules": online_modules,
        "offline_aura_modules": offline_modules,
    }


#------This Function bans a user---------
@router.put("/users/{target_uid}/ban")
async def ban_user(target_uid: str, admin_uid: str = Depends(require_admin)):
    user = await User.find_one(User.firebase_uid == target_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot ban an admin user")
    if target_uid == admin_uid:
        raise HTTPException(status_code=400, detail="Cannot ban your own admin account")
    user.is_banned = True
    user.updated_at = datetime.utcnow()
    await user.save()
    return {"status": "ok"}


#------This Function unbans a user---------
@router.put("/users/{target_uid}/unban")
async def unban_user(target_uid: str, _: str = Depends(require_admin)):
    user = await User.find_one(User.firebase_uid == target_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = False
    user.updated_at = datetime.utcnow()
    await user.save()
    return {"status": "ok"}


#------This Function changes user role---------
@router.put("/users/{target_uid}/role")
async def change_role(
    target_uid: str,
    role: str,
    admin_uid: str = Depends(require_admin),
):
    if role not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail="Invalid role")
    user = await User.find_one(User.firebase_uid == target_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if target_uid == admin_uid:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own role from admin panel",
        )

    new_role = UserRole(role)
    if user.role == new_role:
        return {"status": "ok", "role": user.role.value}

    user.role = new_role
    if new_role in (UserRole.PATIENT, UserRole.ADMIN):
        user.linked_patients = []
    user.updated_at = datetime.utcnow()
    await user.save()
    return {"status": "ok", "role": user.role.value}


#------This Function gets active SOS events---------
@router.get("/sos/active")
async def get_active_sos_admin(
    _: str = Depends(require_admin),
    limit: int = Query(default=50, ge=1, le=200),
):
    events = await (
        SOSEvent.find(SOSEvent.resolved == False)
        .sort([("created_at", -1)])
        .limit(limit)
        .to_list()
    )

    patient_uids = list({event.patient_uid for event in events})
    users = await User.find({"firebase_uid": {"$in": patient_uids}}).to_list()
    user_map = {user.firebase_uid: user for user in users}

    return [
        {
            "id": str(event.id),
            "patient_uid": event.patient_uid,
            "patient_name": (
                user_map[event.patient_uid].display_name
                if event.patient_uid in user_map
                else "Patient"
            ),
            "level": event.level,
            "trigger": event.trigger,
            "message": event.message,
            "location": event.location,
            "created_at": event.created_at.isoformat(),
        }
        for event in events
    ]


#------This Function gets user summary---------
@router.get("/users/{target_uid}/summary")
async def get_user_summary(target_uid: str, _: str = Depends(require_admin)):
    user = await User.find_one(User.firebase_uid == target_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    active_sos = await SOSEvent.find(
        SOSEvent.patient_uid == target_uid,
        SOSEvent.resolved == False,
    ).count()
    medication_count = await Medication.find(Medication.patient_uid == target_uid).count()
    journal_count = await JournalEntry.find(JournalEntry.patient_uid == target_uid).count()
    interactions_count = await OritoInteraction.find(
        OritoInteraction.user_uid == target_uid
    ).count()

    return {
        "user": _serialize_user(user),
        "summary": {
            "active_sos": active_sos,
            "medications": medication_count,
            "journal_entries": journal_count,
            "orito_interactions": interactions_count,
        },
    }
