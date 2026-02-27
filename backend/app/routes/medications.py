import logging
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.core.firebase import get_current_user_uid
from app.models.medication import Medication
from app.models.user import User
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/medications", tags=["medications"])


MAX_NAME_LENGTH = 200
MAX_DOSAGE_LENGTH = 100
MAX_FREQUENCY_LENGTH = 100
MAX_NOTES_LENGTH = 500


class MedCreate(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = ""
    schedule_times: List[str] = []
    notes: str = ""

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Medication name cannot be empty')
        if len(v) > MAX_NAME_LENGTH:
            raise ValueError(f'Medication name cannot exceed {MAX_NAME_LENGTH} characters')
        return v.strip()

    @field_validator('dosage')
    @classmethod
    def validate_dosage(cls, v: str) -> str:
        if v and len(v) > MAX_DOSAGE_LENGTH:
            raise ValueError(f'Dosage cannot exceed {MAX_DOSAGE_LENGTH} characters')
        return v.strip() if v else ""

    @field_validator('frequency')
    @classmethod
    def validate_frequency(cls, v: str) -> str:
        if v and len(v) > MAX_FREQUENCY_LENGTH:
            raise ValueError(f'Frequency cannot exceed {MAX_FREQUENCY_LENGTH} characters')
        return v.strip() if v else ""

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v: str) -> str:
        if v and len(v) > MAX_NOTES_LENGTH:
            raise ValueError(f'Notes cannot exceed {MAX_NOTES_LENGTH} characters')
        return v.strip() if v else ""

    @field_validator('schedule_times')
    @classmethod
    def validate_schedule_times(cls, v: List[str]) -> List[str]:
        if len(v) > 10:
            raise ValueError('Cannot have more than 10 schedule times')
        
        time_pattern = re.compile(r'^([01]?[0-9]|2[0-3]):([0-5][0-9])$')
        for time in v:
            if not time_pattern.match(time):
                raise ValueError(f'Invalid time format: {time}. Use HH:MM format.')
        return v


class MedUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    schedule_times: Optional[List[str]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError('Medication name cannot be empty')
            if len(v) > MAX_NAME_LENGTH:
                raise ValueError(f'Medication name cannot exceed {MAX_NAME_LENGTH} characters')
            return v.strip()
        return v


#------This Function lists medications---------
@router.get("/")
async def list_medications(
    patient_uid: Optional[str] = None,
    uid: str = Depends(get_current_user_uid),
):
    try:
        target = patient_uid or uid
        await _verify_access(uid, target)
        meds = await Medication.find(Medication.patient_uid == target).to_list()
        return [_serialize(m) for m in meds]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list medications for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve medications")


#------This Function gets pending medications---------
@router.get("/pending")
async def pending_medications(uid: str = Depends(get_current_user_uid)):
    try:
        meds = await Medication.find(
            Medication.patient_uid == uid,
            Medication.is_active == True,
        ).to_list()
        return [_serialize(m) for m in meds]
    except Exception as e:
        logger.error(f"Failed to get pending medications for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve pending medications")


#------This Function creates medication---------
@router.post("/")
async def create_medication(
    body: MedCreate,
    patient_uid: Optional[str] = None,
    uid: str = Depends(get_current_user_uid),
):
    try:
        target_uid = patient_uid or uid
        await _verify_access(uid, target_uid)
        med = Medication(patient_uid=target_uid, **body.model_dump())
        await med.insert()
        logger.info(f"Created medication {med.id} for patient {target_uid} by {uid}")
        return _serialize(med)
    except Exception as e:
        logger.error(f"Failed to create medication for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create medication")


#------This Function updates medication---------
@router.put("/{med_id}")
async def update_medication(
    med_id: str, body: MedUpdate, uid: str = Depends(get_current_user_uid)
):
    try:
        med = await Medication.get(med_id)
        if not med:
            raise HTTPException(status_code=404, detail="Medication not found")
        await _verify_access(uid, med.patient_uid)
        updates = body.model_dump(exclude_none=True)
        for k, v in updates.items():
            setattr(med, k, v)
        await med.save()
        logger.info(f"Updated medication {med_id} for user {uid}")
        return _serialize(med)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update medication {med_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update medication")


#------This Function marks medication as taken---------
@router.post("/{med_id}/take")
async def mark_taken(med_id: str, uid: str = Depends(get_current_user_uid)):
    try:
        med = await Medication.get(med_id)
        if not med:
            raise HTTPException(status_code=404, detail="Medication not found")
        await _verify_access(uid, med.patient_uid)
        med.last_taken = datetime.utcnow()
        await med.save()
        logger.info(f"Marked medication {med_id} as taken for user {uid}")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark medication {med_id} as taken: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to mark medication as taken")


#------This Function deletes medication---------
@router.delete("/{med_id}")
async def delete_medication(med_id: str, uid: str = Depends(get_current_user_uid)):
    try:
        med = await Medication.get(med_id)
        if not med:
            raise HTTPException(status_code=404, detail="Medication not found")
        await _verify_access(uid, med.patient_uid)
        await med.delete()
        logger.info(f"Deleted medication {med_id} for user {uid}")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete medication {med_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete medication")


#------This Function verifies access---------
async def _verify_access(requester_uid: str, patient_uid: str):
    if requester_uid == patient_uid:
        return
    user = await User.find_one(User.firebase_uid == requester_uid)
    if not user:
        raise HTTPException(status_code=403, detail="Access denied")
    if user.role.value == "admin":
        return
    if user.role.value == "caregiver" and patient_uid in user.linked_patients:
        return
    raise HTTPException(status_code=403, detail="Access denied")


def _serialize(med: Medication) -> dict:
    return {
        "id": str(med.id),
        "patient_uid": med.patient_uid,
        "name": med.name,
        "dosage": med.dosage,
        "frequency": med.frequency,
        "schedule_times": med.schedule_times,
        "notes": med.notes,
        "is_active": med.is_active,
        "last_taken": med.last_taken.isoformat() if med.last_taken else None,
        "created_at": med.created_at.isoformat(),
    }
