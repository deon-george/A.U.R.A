
import logging
import re
from typing import Optional, List
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

logger = logging.getLogger(__name__)


PORT_RANGE = (1, 65535)
MAX_NAME_LENGTH = 100
NAME_PATTERN = re.compile(r'^[a-zA-Z0-9\s]+$')


def _validate_patient_uid(patient_uid: str) -> None:
    if not patient_uid or not isinstance(patient_uid, str):
        raise ValueError("patient_uid must be a non-empty string")
    if len(patient_uid) > 128:
        raise ValueError("patient_uid must be at most 128 characters")


def _validate_ip(ip: str) -> None:
    if not ip or not isinstance(ip, str):
        raise ValueError("ip must be a non-empty string")
    ip = ip.strip()
    if not ip:
        raise ValueError("ip must be a non-empty string")
    if len(ip) > 255:
        raise ValueError("ip must be at most 255 characters")


def _validate_port(port: int) -> None:
    if not isinstance(port, int):
        raise ValueError("port must be an integer")
    if port < PORT_RANGE[0] or port > PORT_RANGE[1]:
        raise ValueError(f"port must be between {PORT_RANGE[0]} and {PORT_RANGE[1]}")


def _validate_name(name: Optional[str]) -> None:
    if name is None:
        return
    if not isinstance(name, str):
        raise ValueError("name must be a string")
    if len(name) > MAX_NAME_LENGTH:
        raise ValueError(f"name must be at most {MAX_NAME_LENGTH} characters")
    if name and not NAME_PATTERN.match(name):
        raise ValueError("name must contain only alphanumeric characters and spaces")


class AuraModulesDB:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["aura_modules"]

#------This Function creates database indexes---------
    async def ensure_indexes(self):
        try:
            indexes = [
                IndexModel([("patient_uid", ASCENDING)], unique=True),
                IndexModel([("ip", ASCENDING)]),
                IndexModel([("last_seen", ASCENDING)]),
            ]
            await self.collection.create_indexes(indexes)
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
            raise

#------This Function upserts a module---------
    async def upsert_module(
        self,
        patient_uid: str,
        ip: str,
        port: int = 8001,
        hardware_info: Optional[dict] = None,
        name: Optional[str] = None,
    ) -> dict:
        
        _validate_patient_uid(patient_uid)
        _validate_ip(ip)
        ip = ip.strip()
        _validate_port(port)
        _validate_name(name)
        
        if hardware_info is not None and not isinstance(hardware_info, dict):
            raise ValueError("hardware_info must be a dict")
        
        now = datetime.utcnow()
        
        set_dict = {
            "ip": ip,
            "port": port,
            "hardware_info": hardware_info or {},
            "last_seen": now,
            "status": "online",
        }
        
        if name is not None:
            set_dict["name"] = name

        try:
            result = await self.collection.update_one(
                {"patient_uid": patient_uid},
                {
                    "$set": set_dict,
                    "$setOnInsert": {"registered_at": now},
                },
                upsert=True,
            )

            
            module = await self.collection.find_one({"patient_uid": patient_uid})
            return self._serialize_doc(module)
        except Exception as e:
            logger.error(f"Failed to upsert module: {e}")
            raise

#------This Function updates module name---------
    async def update_name(self, patient_uid: str, name: str) -> dict:
        _validate_patient_uid(patient_uid)
        _validate_name(name)
        
        try:
            result = await self.collection.update_one(
                {"patient_uid": patient_uid},
                {
                    "$set": {
                        "name": name,
                    }
                },
            )
            
            if result.matched_count == 0:
                raise ValueError(f"No module found for patient {patient_uid}")
            
            module = await self.collection.find_one({"patient_uid": patient_uid})
            return self._serialize_doc(module)
        except Exception as e:
            logger.error(f"Failed to update module name: {e}")
            raise

#------This Function updates heartbeat---------
    async def update_heartbeat(self, patient_uid: str) -> bool:
        
        if not patient_uid or not isinstance(patient_uid, str):
            raise ValueError("patient_uid must be a non-empty string")
        
        try:
            result = await self.collection.update_one(
                {"patient_uid": patient_uid},
                {
                    "$set": {
                        "last_seen": datetime.utcnow(),
                        "status": "online",
                    }
                },
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update heartbeat: {e}")
            raise

#------This Function gets a module---------
    async def get_module(self, patient_uid: str) -> Optional[dict]:
        try:
            doc = await self.collection.find_one({"patient_uid": patient_uid})
            return self._serialize_doc(doc) if doc else None
        except Exception as e:
            logger.error(f"Failed to get module: {e}")
            raise

#------This Function lists modules---------
    async def list_modules(
        self, status: Optional[str] = None, limit: int = 100
    ) -> List[dict]:
        try:
            query = {}
            if status:
                query["status"] = status

            cursor = self.collection.find(query).sort("last_seen", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            return [self._serialize_doc(doc) for doc in docs]
        except Exception as e:
            logger.error(f"Failed to list modules: {e}")
            raise

#------This Function marks stale modules as offline---------
    async def mark_stale_modules_offline(self, timeout_seconds: int = 120) -> int:
        try:
            cutoff = datetime.utcnow() - timedelta(seconds=timeout_seconds)
            result = await self.collection.update_many(
                {"last_seen": {"$lt": cutoff}, "status": "online"},
                {"$set": {"status": "offline"}},
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Failed to mark stale modules offline: {e}")
            raise

#------This Function deletes a module---------
    async def delete_module(self, patient_uid: str) -> bool:
        try:
            result = await self.collection.delete_one({"patient_uid": patient_uid})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Failed to delete module: {e}")
            raise

    def _serialize_doc(self, doc: Optional[dict]) -> Optional[dict]:
        if not doc:
            return None
        doc["_id"] = str(doc["_id"])
        return doc
