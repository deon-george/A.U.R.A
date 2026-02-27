from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ReminderStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DISMISSED = "dismissed"


class Reminder(Document):
    patient_uid: Indexed(str)
    title: str
    description: str = ""
    datetime: datetime
    repeat_pattern: Optional[str] = None
    status: Indexed(str) = ReminderStatus.ACTIVE.value
    created_by: str = "user"
    source: str = "manual"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "reminders"


class ReminderCreate(BaseModel):
    title: str
    description: str = ""
    datetime: datetime
    repeat_pattern: Optional[str] = None
    created_by: str = "user"
    source: str = "ai_generated"


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    datetime: Optional[datetime] = None
    repeat_pattern: Optional[str] = None
    status: Optional[ReminderStatus] = None


class ReminderResponse(BaseModel):
    id: str
    title: str
    description: str
    datetime: str
    repeat_pattern: Optional[str] = None
    status: str
    created_by: str
    source: str
    created_at: str

    class Config:
        from_attributes = True
