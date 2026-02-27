
import logging
from typing import Optional, List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING

logger = logging.getLogger(__name__)


class AuraEventsDB:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["aura_events"]

#------This Function creates database indexes---------
    async def ensure_indexes(self):
        try:
            indexes = [
                IndexModel([("module_id", ASCENDING)]),
                IndexModel([("patient_uid", ASCENDING)]),
                IndexModel([("event_type", ASCENDING)]),
                IndexModel([("timestamp", DESCENDING)]),
            ]
            await self.collection.create_indexes(indexes)
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
            raise

#------This Function logs face detection events---------
    async def log_face_detection(
        self,
        patient_uid: str,
        module_id: str,
        detected_faces: List[dict],
    ) -> str:
        
        if not isinstance(detected_faces, list):
            raise ValueError("detected_faces must be a list")
        
        doc = {
            "event_type": "face_detection",
            "patient_uid": patient_uid,
            "module_id": module_id,
            "timestamp": datetime.utcnow(),
            "data": {
                "detected_faces": detected_faces,
                "num_faces": len(detected_faces),
            },
        }
        
        try:
            result = await self.collection.insert_one(doc)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to log face detection: {e}")
            raise

#------This Function logs conversation events---------
    async def log_conversation(
        self,
        patient_uid: str,
        module_id: str,
        transcript: str,
        extracted_events: List[dict],
        mood: str = "",
    ) -> str:
        
        if not isinstance(transcript, str):
            raise ValueError("transcript must be a string")
        
        
        if not isinstance(extracted_events, list):
            raise ValueError("extracted_events must be a list")
        
        doc = {
            "event_type": "conversation",
            "patient_uid": patient_uid,
            "module_id": module_id,
            "timestamp": datetime.utcnow(),
            "data": {
                "transcript": transcript,
                "extracted_events": extracted_events,
                "mood": mood,
                "num_events": len(extracted_events),
            },
        }
        
        try:
            result = await self.collection.insert_one(doc)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to log conversation: {e}")
            raise

#------This Function logs conversation summary---------
    async def log_conversation_summary(
        self,
        patient_uid: str,
        module_id: str,
        summary: str,
        transcript_count: int = 0,
    ) -> str:
        if not isinstance(summary, str):
            raise ValueError("summary must be a string")

        doc = {
            "event_type": "conversation_summary",
            "patient_uid": patient_uid,
            "module_id": module_id,
            "timestamp": datetime.utcnow(),
            "data": {
                "summary": summary,
                "transcript_count": transcript_count,
            },
        }

        try:
            result = await self.collection.insert_one(doc)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to log conversation summary: {e}")
            raise

#------This Function retrieves events---------
    async def get_events(
        self,
        patient_uid: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        query = {}
        if patient_uid:
            query["patient_uid"] = patient_uid
        if event_type:
            query["event_type"] = event_type

        try:
            cursor = self.collection.find(query).sort("timestamp", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            return [self._serialize_doc(doc) for doc in docs]
        except Exception as e:
            logger.error(f"Failed to get events: {e}")
            raise

    def _serialize_doc(self, doc: dict) -> dict:
        doc["_id"] = str(doc["_id"])
        return doc
