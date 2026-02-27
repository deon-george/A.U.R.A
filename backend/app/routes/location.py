from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.firebase import get_current_user_uid
from app.models.user import User, UserRole
from app.models.sos import SOSEvent, SOSLevel, SOSTrigger
from app.services.notifications import notification_service
from datetime import datetime

router = APIRouter(prefix="/location", tags=["location"])


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    timestamp: Optional[int] = None


class GeofenceEvent(BaseModel):
    event_type: str
    region_id: str
    region_name: str
    timestamp: int


#------This Function updates location---------
@router.put("/update")
async def update_location(
    body: LocationUpdate, uid: str = Depends(get_current_user_uid)
):
    user = await User.find_one(User.firebase_uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.last_location = {
        "latitude": body.latitude,
        "longitude": body.longitude,
        "accuracy": body.accuracy,
        "altitude": body.altitude,
        "heading": body.heading,
        "speed": body.speed,
        "timestamp": body.timestamp or int(datetime.utcnow().timestamp() * 1000),
    }
    user.updated_at = datetime.utcnow()
    await user.save()
    return {"status": "ok"}


#------This Function gets patient location---------
@router.get("/{patient_uid}")
async def get_patient_location(
    patient_uid: str, uid: str = Depends(get_current_user_uid)
):
    requester = await User.find_one(User.firebase_uid == uid)
    if not requester:
        raise HTTPException(status_code=403, detail="Access denied")

    can_access = (
        requester.role.value == "admin"
        or uid == patient_uid
        or (
            requester.role.value == "caregiver"
            and patient_uid in requester.linked_patients
        )
    )
    if not can_access:
        raise HTTPException(status_code=403, detail="Access denied")

    patient = await User.find_one(User.firebase_uid == patient_uid)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {
        "patient_uid": patient_uid,
        "location": patient.last_location,
        "display_name": patient.display_name,
    }


#------This Function handles geofence events---------
@router.post("/geofence-event")
async def handle_geofence_event(
    body: GeofenceEvent, uid: str = Depends(get_current_user_uid)
):
    patient = await User.find_one(User.firebase_uid == uid)
    if not patient:
        raise HTTPException(status_code=404, detail="User not found")

    
    if body.event_type == "exit" and body.region_name == "safe_zone":
        
        sos_event = SOSEvent(
            patient_uid=uid,
            level=SOSLevel.MEDIUM,
            trigger=SOSTrigger.AUTO,
            message=f"Patient left {body.region_name}",
            location=patient.last_location,
        )
        await sos_event.save()

        
        caregiver_uids = []
        if patient.role == UserRole.PATIENT:
            
            caregivers = await User.find(
                User.role == UserRole.CAREGIVER, User.linked_patients == uid
            ).to_list()
            caregiver_uids = [c.firebase_uid for c in caregivers]

        
        for caregiver_uid in caregiver_uids:
            await notification_service.send_geofence_alert(
                caregiver_uid=caregiver_uid,
                patient_name=patient.display_name or "Patient",
                patient_uid=uid,
                event_type=body.event_type,
                region_name=body.region_name,
            )

        return {
            "status": "alert_created",
            "sos_id": str(sos_event.id),
            "notified_caregivers": len(caregiver_uids),
        }
    else:
        
        return {
            "status": "logged",
            "event_type": body.event_type,
            "region_name": body.region_name,
        }
