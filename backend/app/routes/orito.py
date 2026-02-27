from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.firebase import get_current_user_uid
from app.models.orito_interaction import (
    OritoInteraction,
    OritoInteractionCreate,
    OritoInteractionResponse,
    InteractionType,
)

router = APIRouter(prefix="/orito", tags=["orito"])


#------This Function converts interaction to response---------
def _to_response(interaction: OritoInteraction) -> OritoInteractionResponse:
    return OritoInteractionResponse(
        id=str(interaction.id),
        user_uid=interaction.user_uid,
        interaction_type=interaction.interaction_type.value,
        user_message=interaction.user_message,
        bot_response=interaction.bot_response,
        emotions_detected=interaction.emotions_detected,
        tools_used=interaction.tools_used,
        metadata=interaction.metadata,
        created_at=interaction.created_at,
    )


#------This Function creates interaction---------
@router.post("/interactions", response_model=OritoInteractionResponse)
async def create_interaction(
    body: OritoInteractionCreate,
    uid: str = Depends(get_current_user_uid)
):
    interaction = OritoInteraction(
        user_uid=uid,
        interaction_type=body.interaction_type,
        user_message=body.user_message,
        bot_response=body.bot_response,
        emotions_detected=body.emotions_detected,
        tools_used=body.tools_used,
        metadata=body.metadata,
    )
    await interaction.insert()
    return _to_response(interaction)


#------This Function gets interactions---------
@router.get("/interactions", response_model=List[OritoInteractionResponse])
async def get_interactions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    interaction_type: Optional[InteractionType] = None,
    uid: str = Depends(get_current_user_uid)
):
    query = OritoInteraction.find(OritoInteraction.user_uid == uid)
    
    if interaction_type:
        query = query.find(OritoInteraction.interaction_type == interaction_type)
    
    interactions = await query.sort("-created_at").skip(offset).limit(limit).to_list()
    return [_to_response(i) for i in interactions]


#------This Function gets recent interactions---------
@router.get("/interactions/recent", response_model=List[OritoInteractionResponse])
async def get_recent_interactions(
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(20, ge=1, le=100),
    uid: str = Depends(get_current_user_uid)
):
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    interactions = await (
        OritoInteraction
        .find(OritoInteraction.user_uid == uid)
        .find(OritoInteraction.created_at >= cutoff)
        .sort("-created_at")
        .limit(limit)
        .to_list()
    )
    return [_to_response(i) for i in interactions]


#------This Function gets interaction---------
@router.get("/interactions/{interaction_id}", response_model=OritoInteractionResponse)
async def get_interaction(
    interaction_id: str,
    uid: str = Depends(get_current_user_uid)
):
    interaction = await OritoInteraction.get(interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.user_uid != uid:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return _to_response(interaction)


#------This Function deletes interaction---------
@router.delete("/interactions/{interaction_id}")
async def delete_interaction(
    interaction_id: str,
    uid: str = Depends(get_current_user_uid)
):
    interaction = await OritoInteraction.get(interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    if interaction.user_uid != uid:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await interaction.delete()
    return {"message": "Interaction deleted successfully"}


#------This Function gets emotion analytics---------
@router.get("/analytics/emotions")
async def get_emotion_analytics(
    days: int = Query(7, ge=1, le=30),
    uid: str = Depends(get_current_user_uid)
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    interactions = await (
        OritoInteraction
        .find(OritoInteraction.user_uid == uid)
        .find(OritoInteraction.created_at >= cutoff)
        .to_list()
    )
    
    
    emotion_counts: dict = {}
    for interaction in interactions:
        for emotion in interaction.emotions_detected:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
    
    
    sorted_emotions = sorted(
        emotion_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    return {
        "period_days": days,
        "total_interactions": len(interactions),
        "emotion_counts": dict(sorted_emotions),
        "dominant_emotion": sorted_emotions[0][0] if sorted_emotions else None,
    }
