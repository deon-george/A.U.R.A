from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    ADMIN = "admin"


class IllnessDetails(BaseModel):
    condition: str = ""
    severity: str = ""
    diagnosis_date: Optional[str] = None
    notes: str = ""


class User(Document):
    firebase_uid: str
    email: str
    display_name: str = ""
    photo_url: str = ""
    role: UserRole = UserRole.PATIENT
    illness: Optional[IllnessDetails] = None
    caregiver_emails: List[str] = Field(default_factory=list)
    linked_patients: List[str] = Field(default_factory=list)
    is_banned: bool = False
    is_onboarded: bool = False
    aura_module_ip: Optional[str] = None
    last_location: Optional[dict] = None
    preferences: dict = Field(default_factory=dict)
    fcm_tokens: List[str] = Field(
        default_factory=list
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
