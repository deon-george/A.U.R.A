from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, time


class NotificationPreferences(BaseModel):
    enabled: bool = True
    medication_reminders: bool = True
    sos_alerts: bool = True
    geofence_alerts: bool = True
    daily_insights: bool = True
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = "22:00"  
    quiet_hours_end: Optional[str] = "08:00"


class AppearanceSettings(BaseModel):
    theme: str = "dark"  
    font_size: str = "medium"
    high_contrast: bool = False


class PrivacySettings(BaseModel):
    location_tracking: bool = True
    share_data_with_caregivers: bool = True
    anonymous_analytics: bool = True
    geofence_alerts: bool = True


class VoiceSettings(BaseModel):
    voice_assistant_enabled: bool = True
    voice_feedback: bool = True
    language: str = "en"  
    voice_gender: str = "male"
    voice_speed: float = Field(default=1.0, ge=0.5, le=2.0)  
    voice_pitch: float = Field(default=1.0, ge=0.5, le=2.0)
    wake_word_enabled: bool = False
    auto_listen: bool = False


class AccessibilitySettings(BaseModel):
    screen_reader: bool = False
    large_buttons: bool = False
    reduce_motion: bool = False
    high_contrast: bool = False


class UserSettings(Document):
    user_uid: str  
    notifications: NotificationPreferences = Field(
        default_factory=NotificationPreferences
    )
    appearance: AppearanceSettings = Field(default_factory=AppearanceSettings)
    privacy: PrivacySettings = Field(default_factory=PrivacySettings)
    voice: VoiceSettings = Field(default_factory=VoiceSettings)
    accessibility: AccessibilitySettings = Field(default_factory=AccessibilitySettings)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "user_settings"
