from beanie import Document
from pydantic import Field
from typing import Optional, List
from datetime import datetime


class ExtractedEvent(dict):
    pass


class JournalEntry(Document):
    patient_uid: str
    content: str
    source: str = "manual"
    speaker_tags: List[dict] = Field(default_factory=list)
    extracted_events: List[dict] = Field(default_factory=list)
    mood: str = ""
    ai_summary: str = ""  
    event_datetime: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "journal_entries"
