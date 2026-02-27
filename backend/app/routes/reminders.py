from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.core.firebase import get_current_user_uid
from app.models.reminder import Reminder, ReminderCreate, ReminderUpdate, ReminderResponse, ReminderStatus
from app.models.user import User

router = APIRouter(prefix="/reminders", tags=["reminders"])


#------This Function serializes reminder---------
def _serialize_reminder(reminder: Reminder) -> ReminderResponse:
    return ReminderResponse(
        id=str(reminder.id),
        title=reminder.title,
        description=reminder.description,
        datetime=reminder.datetime.isoformat(),
        repeat_pattern=reminder.repeat_pattern,
        status=reminder.status,
        created_by=reminder.created_by,
        source=reminder.source,
        created_at=reminder.created_at.isoformat()
    )


#------This Function creates reminder---------
@router.post("/", response_model=ReminderResponse)
async def create_reminder(
    body: ReminderCreate,
    patient_uid: Optional[str] = None,
    uid: str = Depends(get_current_user_uid)
):
    target_uid = patient_uid or uid
    await _verify_access(uid, target_uid)
    reminder = Reminder(
        patient_uid=target_uid,
        title=body.title,
        description=body.description,
        datetime=body.datetime,
        repeat_pattern=body.repeat_pattern,
        status=ReminderStatus.ACTIVE.value,
        created_by=body.created_by,
        source=body.source,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    await reminder.insert()
    return _serialize_reminder(reminder)


#------This Function lists reminders---------
@router.get("/", response_model=List[ReminderResponse])
async def list_reminders(
    status: Optional[str] = Query("active", pattern="^(active|completed|all)$"),
    limit: int = Query(50, ge=1, le=200),
    patient_uid: Optional[str] = None,
    uid: str = Depends(get_current_user_uid)
):
    target_uid = patient_uid or uid
    await _verify_access(uid, target_uid)
    query = Reminder.patient_uid == target_uid
    
    if status != "all":
        query = query & (Reminder.status == status)
    
    reminders = await Reminder.find(query).sort(Reminder.datetime).limit(limit).to_list()
    return [_serialize_reminder(r) for r in reminders]


#------This Function gets active reminders---------
@router.get("/active", response_model=List[ReminderResponse])
async def get_active_reminders(
    limit: int = Query(10, ge=1, le=50),
    patient_uid: Optional[str] = None,
    uid: str = Depends(get_current_user_uid)
):
    target_uid = patient_uid or uid
    await _verify_access(uid, target_uid)
    query = (Reminder.patient_uid == target_uid) & (Reminder.status == ReminderStatus.ACTIVE.value)
    reminders = await Reminder.find(query).sort(Reminder.datetime).limit(limit).to_list()
    return [_serialize_reminder(r) for r in reminders]


#------This Function gets reminder---------
@router.get("/{reminder_id}", response_model=ReminderResponse)
async def get_reminder(
    reminder_id: str,
    uid: str = Depends(get_current_user_uid)
):
    reminder = await Reminder.get(reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await _verify_access(uid, reminder.patient_uid)
    return _serialize_reminder(reminder)


#------This Function updates reminder---------
@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: str,
    body: ReminderUpdate,
    uid: str = Depends(get_current_user_uid)
):
    reminder = await Reminder.get(reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await _verify_access(uid, reminder.patient_uid)
    
    
    if body.title is not None:
        reminder.title = body.title
    if body.description is not None:
        reminder.description = body.description
    if body.datetime is not None:
        reminder.datetime = body.datetime
    if body.repeat_pattern is not None:
        reminder.repeat_pattern = body.repeat_pattern
    if body.status is not None:
        reminder.status = body.status.value
    
    reminder.updated_at = datetime.utcnow()
    await reminder.save()
    
    return _serialize_reminder(reminder)


#------This Function deletes reminder---------
@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    uid: str = Depends(get_current_user_uid)
):
    reminder = await Reminder.get(reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await _verify_access(uid, reminder.patient_uid)
    
    await reminder.delete()
    return {"status": "deleted", "id": reminder_id}


#------This Function completes reminder---------
@router.post("/{reminder_id}/complete")
async def complete_reminder(
    reminder_id: str,
    uid: str = Depends(get_current_user_uid)
):
    reminder = await Reminder.get(reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await _verify_access(uid, reminder.patient_uid)
    
    reminder.status = ReminderStatus.COMPLETED.value
    reminder.updated_at = datetime.utcnow()
    await reminder.save()
    
    return {"status": "completed", "id": reminder_id}


#------This Function verifies access---------
async def _verify_access(requester_uid: str, patient_uid: str):
    if requester_uid == patient_uid:
        return
    requester = await User.find_one(User.firebase_uid == requester_uid)
    if not requester:
        raise HTTPException(status_code=403, detail="Access denied")
    if requester.role.value == "admin":
        return
    if requester.role.value == "caregiver" and patient_uid in requester.linked_patients:
        return
    raise HTTPException(status_code=403, detail="Access denied")
