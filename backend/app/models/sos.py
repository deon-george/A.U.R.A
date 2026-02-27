from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum


class SOSLevel(int, Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
    EMERGENCY = 5


class SOSTrigger(str, Enum):
    BUTTON = "button"
    VOICE = "voice"
    AUTO = "auto"


class SOSEvent(Document):
    patient_uid: str
    level: int = SOSLevel.MEDIUM
    trigger: str = SOSTrigger.BUTTON
    message: str = ""
    location: Optional[dict] = None
    resolved: bool = False
    resolved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

    class Settings:
        name = "sos_events"
