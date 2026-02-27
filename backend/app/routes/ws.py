from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi import HTTPException
from typing import Dict
import json
import asyncio
from app.utils.access_control import check_patient_access

router = APIRouter(tags=["websocket"])

_connections: Dict[str, WebSocket] = {}
_connections_lock = asyncio.Lock()


#------This Function verifies token---------
async def verify_token(websocket: WebSocket, token: str) -> str:
    from firebase_admin import auth as firebase_auth
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        await websocket.close(code=4003, reason="Invalid or expired token")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


#------This Function handles websocket endpoint---------
@router.websocket("/ws/{user_uid}")
async def websocket_endpoint(ws: WebSocket, user_uid: str, token: str = Query(...)):
    
    authenticated_uid = await verify_token(ws, token)
    
    
    if authenticated_uid != user_uid:
        await ws.close(code=4003, reason="Token mismatch")
        return
    
    await ws.accept()
    
    
    async with _connections_lock:
        old_ws = _connections.get(user_uid)
        if old_ws:
            try:
                await old_ws.close(code=4001, reason="Replaced by new connection")
            except Exception:
                pass
        _connections[user_uid] = ws
    
    try:
        while True:
            data = await ws.receive_text()
            
            
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})
                continue
            
            msg_type = msg.get("type", "")

            if msg_type == "ping":
                await ws.send_json({"type": "pong"})

            elif msg_type == "sos_alert":
                patient_uid = msg.get("patient_uid", user_uid)
                
                
                has_access = await check_patient_access(user_uid, patient_uid)
                if not has_access:
                    await ws.send_json({"type": "error", "message": "Unauthorized: You don't have permission to send SOS for this patient"})
                    continue
                
                await broadcast_to_caregivers(patient_uid, msg)

            elif msg_type == "aura_status":
                await ws.send_json({"type": "ack", "status": "received"})

    except WebSocketDisconnect:
        async with _connections_lock:
            _connections.pop(user_uid, None)
    except Exception:
        async with _connections_lock:
            _connections.pop(user_uid, None)


#------This Function broadcasts to caregivers---------
async def broadcast_to_caregivers(patient_uid: str, message: dict):
    from app.models.user import User
    patient = await User.find_one(User.firebase_uid == patient_uid)
    if not patient:
        return
    caregivers = await User.find(
        {"linked_patients": patient_uid}
    ).to_list()
    
    async with _connections_lock:
        for cg in caregivers:
            ws = _connections.get(cg.firebase_uid)
            if ws:
                try:
                    await ws.send_json(message)
                except Exception:
                    _connections.pop(cg.firebase_uid, None)


#------This Function sends message to user---------
async def send_to_user(user_uid: str, message: dict):
    async with _connections_lock:
        ws = _connections.get(user_uid)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                _connections.pop(user_uid, None)
