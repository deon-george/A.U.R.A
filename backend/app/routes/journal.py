import logging
import re
import html
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.core.firebase import get_current_user_uid
from app.models.journal import JournalEntry
from app.utils.datetime_parser import parse_datetime_from_text
from app.services.summarizer import summarize_conversation
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/journal", tags=["journal"])


MAX_CONTENT_LENGTH = 10000


#------This Function sanitizes text---------
def sanitize_text(text: str) -> str:
    if not text:
        return text
    
    text = text.strip()
    
    text = html.escape(text)
    return text


class JournalCreate(BaseModel):
    content: str
    source: str = "manual"
    speaker_tags: List[dict] = []
    extracted_events: List[dict] = []
    mood: str = ""
    event_datetime_text: Optional[str] = None
    messages: Optional[List[dict]] = None

    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        if len(v) > MAX_CONTENT_LENGTH:
            raise ValueError(f'Content cannot exceed {MAX_CONTENT_LENGTH} characters')
        return v.strip()

    @field_validator('source')
    @classmethod
    def validate_source(cls, v: str) -> str:
        allowed_sources = ['manual', 'voice', 'ai_generated', 'import']
        if v not in allowed_sources:
            raise ValueError(f'Source must be one of: {", ".join(allowed_sources)}')
        return v

    @field_validator('mood')
    @classmethod
    def validate_mood(cls, v: str) -> str:
        if v and len(v) > 50:
            raise ValueError('Mood cannot exceed 50 characters')
        return v.strip() if v else ""


class JournalUpdate(BaseModel):
    content: Optional[str] = None
    mood: Optional[str] = None

    @field_validator('content')
    @classmethod
    def validate_content(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError('Content cannot be empty')
            if len(v) > MAX_CONTENT_LENGTH:
                raise ValueError(f'Content cannot exceed {MAX_CONTENT_LENGTH} characters')
            return v.strip()
        return v

    @field_validator('mood')
    @classmethod
    def validate_mood(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) > 50:
                raise ValueError('Mood cannot exceed 50 characters')
            return v.strip()
        return v


#------This Function lists journal entries---------
@router.get("/")
async def list_entries(
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    uid: str = Depends(get_current_user_uid),
):
    try:
        entries = (
            await JournalEntry.find(JournalEntry.patient_uid == uid)
            .sort(-JournalEntry.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )
        return [_serialize(e) for e in entries]
    except Exception as e:
        logger.error(f"Failed to list journal entries for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve journal entries")


#------This Function searches journal entries---------
@router.get("/search")
async def search_entries(
    q: str = Query(..., min_length=1, max_length=200),
    uid: str = Depends(get_current_user_uid),
):
    try:
        pattern = re.compile(re.escape(q), re.IGNORECASE)
        entries = await JournalEntry.find(
            JournalEntry.patient_uid == uid,
            {"content": {"$regex": pattern.pattern, "$options": "i"}},
        ).to_list()
        return [_serialize(e) for e in entries]
    except Exception as e:
        logger.error(f"Failed to search journal entries for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search journal entries")


#------This Function gets journal entry---------
@router.get("/{entry_id}")
async def get_entry(entry_id: str, uid: str = Depends(get_current_user_uid)):
    try:
        entry = await JournalEntry.get(entry_id)
        if not entry or entry.patient_uid != uid:
            raise HTTPException(status_code=404, detail="Not found")
        return _serialize(entry)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get journal entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve journal entry")


#------This Function creates journal entry---------
@router.post("/")
async def create_entry(body: JournalCreate, uid: str = Depends(get_current_user_uid)):
    try:
        
        event_datetime = None
        if body.event_datetime_text:
            event_datetime = parse_datetime_from_text(body.event_datetime_text)

        
        if not event_datetime and body.extracted_events:
            for event in body.extracted_events:
                if "time" in event or "datetime" in event:
                    time_text = event.get("time") or event.get("datetime")
                    if time_text:
                        event_datetime = parse_datetime_from_text(time_text)
                        break

        entry_data = body.model_dump(exclude={"event_datetime_text"})
        entry_data["event_datetime"] = event_datetime

        
        ai_summary = ""
        if body.source == "ai_generated" and body.messages:
            try:
                ai_summary = await summarize_conversation(body.messages)
                logger.info(f"Generated AI summary for journal entry: {ai_summary[:50]}...")
            except Exception as e:
                logger.error(f"Failed to generate AI summary: {str(e)}")
                ai_summary = ""
        entry_data["ai_summary"] = ai_summary

        entry = JournalEntry(patient_uid=uid, **entry_data)
        await entry.insert()
        logger.info(f"Created journal entry {entry.id} for user {uid}")
        return _serialize(entry)
    except Exception as e:
        logger.error(f"Failed to create journal entry for user {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create journal entry")


#------This Function updates journal entry---------
@router.put("/{entry_id}")
async def update_entry(
    entry_id: str, body: JournalUpdate, uid: str = Depends(get_current_user_uid)
):
    try:
        entry = await JournalEntry.get(entry_id)
        if not entry or entry.patient_uid != uid:
            raise HTTPException(status_code=404, detail="Not found")
        updates = body.model_dump(exclude_none=True)
        for k, v in updates.items():
            setattr(entry, k, v)
        await entry.save()
        logger.info(f"Updated journal entry {entry_id} for user {uid}")
        return _serialize(entry)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update journal entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update journal entry")


#------This Function deletes journal entry---------
@router.delete("/{entry_id}")
async def delete_entry(entry_id: str, uid: str = Depends(get_current_user_uid)):
    try:
        entry = await JournalEntry.get(entry_id)
        if not entry or entry.patient_uid != uid:
            raise HTTPException(status_code=404, detail="Not found")
        await entry.delete()
        logger.info(f"Deleted journal entry {entry_id} for user {uid}")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete journal entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete journal entry")


def _serialize(entry: JournalEntry) -> dict:
    return {
        "id": str(entry.id),
        "content": entry.content,
        "source": entry.source,
        "speaker_tags": entry.speaker_tags,
        "extracted_events": entry.extracted_events,
        "mood": entry.mood,
        "ai_summary": entry.ai_summary,
        "event_datetime": entry.event_datetime.isoformat()
        if entry.event_datetime
        else None,
        "created_at": entry.created_at.isoformat(),
    }
