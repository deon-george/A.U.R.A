from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class InteractionType(str, Enum):
    VOICE = "voice"
    TEXT = "text"


class OritoInteraction(Document):
    user_uid: str
    interaction_type: InteractionType = InteractionType.TEXT
    user_message: str
    bot_response: str
    emotions_detected: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "orito_interactions"


class OritoInteractionCreate(BaseModel):
    interaction_type: InteractionType = InteractionType.TEXT
    user_message: str
    bot_response: str
    emotions_detected: List[str] = []
    tools_used: List[str] = []
    metadata: Dict[str, Any] = {}


class OritoInteractionResponse(BaseModel):
    id: str
    user_uid: str
    interaction_type: str
    user_message: str
    bot_response: str
    emotions_detected: List[str]
    tools_used: List[str]
    metadata: Dict[str, Any]
    created_at: datetime
