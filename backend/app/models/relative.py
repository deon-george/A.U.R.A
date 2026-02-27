from beanie import Document
from pydantic import Field
from typing import Optional, List
from datetime import datetime


class Relative(Document):
    patient_uid: str
    name: str
    relationship: str = ""
    phone: str = ""
    photos: List[str] = Field(default_factory=list)
    face_embeddings: List[List[float]] = Field(default_factory=list)
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "relatives"
