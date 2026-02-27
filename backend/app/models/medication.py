from beanie import Document
from pydantic import Field
from typing import Optional, List
from datetime import datetime


class Medication(Document):
    patient_uid: str
    name: str
    dosage: str = ""
    frequency: str = ""
    schedule_times: List[str] = Field(default_factory=list)
    notes: str = ""
    is_active: bool = True
    last_taken: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "medications"
