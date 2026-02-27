from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.firebase import get_current_user_uid
from app.models.sos import SOSEvent
from app.models.user import User, UserRole
from app.services.notifications import notification_service
from datetime import datetime

router = APIRouter(prefix="/sos", tags=["sos"])


class SOSTriggerRequest(BaseModel):
    level: int = 2
    trigger: str = "button"
    message: str = ""
    location: Optional[dict] = None


#------This Function triggers SOS---------
@router.post("/trigger")
async def trigger_sos(
    body: SOSTriggerRequest, uid: str = Depends(get_current_user_uid)
):
    
    patient = await User.find_one(User.firebase_uid == uid)
    if not patient:
        raise HTTPException(status_code=404, detail="User not found")

    
    event = SOSEvent(patient_uid=uid, **body.model_dump())
    await event.insert()

    
    caregiver_uids = []
    if patient.role == UserRole.PATIENT:
        
        caregivers = await User.find(
            User.role == UserRole.CAREGIVER, User.linked_patients == uid
        ).to_list()
        caregiver_uids = [c.firebase_uid for c in caregivers]

    
    notifications_sent = 0
    for caregiver_uid in caregiver_uids:
        count = await notification_service.send_sos_notification(
            caregiver_uid=caregiver_uid,
            patient_name=patient.display_name or "Patient",
            patient_uid=uid,
            sos_id=str(event.id),
            location=body.location or patient.last_location,
        )
        notifications_sent += count

    return {
        "status": "ok",
        "sos_id": str(event.id),
        "level": event.level,
        "notifications_sent": notifications_sent,
        "caregivers_notified": len(caregiver_uids),
    }


#------This Function gets active SOS---------
@router.get("/active")
async def get_active_sos(
    patient_uid: Optional[str] = None,
    uid: str = Depends(get_current_user_uid),
):
    user = await User.find_one(User.firebase_uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role.value == "caregiver":
        targets = user.linked_patients
        if patient_uid and patient_uid in targets:
            targets = [patient_uid]
        events = (
            await SOSEvent.find({"patient_uid": {"$in": targets}, "resolved": False})
            .sort([("created_at", -1)])
            .to_list()
        )
    else:
        events = (
            await SOSEvent.find(
                SOSEvent.patient_uid == uid,
                SOSEvent.resolved == False,
            )
            .sort([("created_at", -1)])
            .to_list()
        )

    return [_serialize(e) for e in events]


#------This Function lists SOS events---------
@router.get("/")
async def list_sos(
    patient_uid: Optional[str] = None,
    limit: int = 100,
    uid: str = Depends(get_current_user_uid),
):
    user = await User.find_one(User.firebase_uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == UserRole.ADMIN:
        if patient_uid:
            events = (
                await SOSEvent.find(SOSEvent.patient_uid == patient_uid)
                .sort([("created_at", -1)])
                .limit(limit)
                .to_list()
            )
        else:
            events = (
                await SOSEvent.find()
                .sort([("created_at", -1)])
                .limit(limit)
                .to_list()
            )
        return [_serialize(e) for e in events]

    if user.role == UserRole.CAREGIVER:
        targets = user.linked_patients
        if patient_uid:
            if patient_uid not in targets:
                raise HTTPException(status_code=403, detail="Access denied")
            targets = [patient_uid]
        events = (
            await SOSEvent.find({"patient_uid": {"$in": targets}})
            .sort([("created_at", -1)])
            .limit(limit)
            .to_list()
        )
        return [_serialize(e) for e in events]

    target_uid = uid
    if patient_uid and patient_uid != uid:
        raise HTTPException(status_code=403, detail="Access denied")
    events = (
        await SOSEvent.find(SOSEvent.patient_uid == target_uid)
        .sort([("created_at", -1)])
        .limit(limit)
        .to_list()
    )
    return [_serialize(e) for e in events]


#------This Function resolves SOS---------
@router.post("/{sos_id}/resolve")
async def resolve_sos(sos_id: str, uid: str = Depends(get_current_user_uid)):
    event = await SOSEvent.get(sos_id)
    if not event:
        raise HTTPException(status_code=404, detail="Not found")

    user = await User.find_one(User.firebase_uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == UserRole.ADMIN:
        pass
    elif user.role == UserRole.CAREGIVER:
        if event.patient_uid not in user.linked_patients:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(
            status_code=403,
            detail="Only caregivers or admins can resolve SOS alerts",
        )

    event.resolved = True
    event.resolved_by = uid
    event.resolved_at = datetime.utcnow()
    await event.save()
    return {"status": "ok"}


def _serialize(event: SOSEvent) -> dict:
    return {
        "id": str(event.id),
        "patient_uid": event.patient_uid,
        "level": event.level,
        "trigger": event.trigger,
        "message": event.message,
        "location": event.location,
        "resolved": event.resolved,
        "resolved_by": event.resolved_by,
        "resolved_at": event.resolved_at.isoformat() if event.resolved_at else None,
        "status": "resolved" if event.resolved else "active",
        "created_at": event.created_at.isoformat(),
    }
