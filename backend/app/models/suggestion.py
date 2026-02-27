from beanie import Document
from pydantic import Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SuggestionType(str, Enum):
    MEDICATION = "medication"
    ACTIVITY = "activity"
    WELLNESS = "wellness"
    REMINDER = "reminder"
    ROUTINE = "routine"
    GENERAL = "general"


class SuggestionStatus(str, Enum):
    ACTIVE = "active"
    DISMISSED = "dismissed"
    COMPLETED = "completed"
    CONFIRMED = "confirmed"


class Suggestion(Document):
    user_uid: str  
    type: SuggestionType = SuggestionType.GENERAL
    title: str
    description: str
    status: SuggestionStatus = SuggestionStatus.ACTIVE
    priority: int = 1

    
    context_data: Optional[dict] = None

    
    action_label: Optional[str] = None
    action_data: Optional[dict] = None

    
    suggested_time: Optional[str] = None
    expires_at: Optional[datetime] = None

    
    shown_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    dismissed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Settings:
        name = "suggestions"


class SuggestionHistory(Document):

    user_uid: str
    suggestion_id: str
    suggestion_type: SuggestionType
    action_taken: str
    time_to_action: Optional[int] = None
    was_helpful: Optional[bool] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "suggestion_history"
