from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

from models.property import Session, StatusUpdateRequest
from services.db import sessions_col

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", status_code=201)
async def create_session() -> dict:
    session_id = str(uuid.uuid4())
    doc = {
        "_id": session_id,
        "createdAt": datetime.now(timezone.utc),
        "properties": [],
    }
    await sessions_col().insert_one(doc)
    return {"sessionId": session_id}


@router.get("/{session_id}")
async def get_session(session_id: str) -> Session:
    doc = await sessions_col().find_one({"_id": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    doc["id"] = doc.pop("_id")
    return Session(**doc)


@router.patch("/{session_id}/properties/{property_id}", status_code=204)
async def update_property_status(session_id: str, property_id: str, body: StatusUpdateRequest):
    result = await sessions_col().update_one(
        {"_id": session_id, "properties.id": property_id},
        {"$set": {"properties.$.status": body.status}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session or property not found")


@router.delete("/{session_id}/properties/{property_id}", status_code=204)
async def delete_property(session_id: str, property_id: str):
    result = await sessions_col().update_one(
        {"_id": session_id},
        {"$pull": {"properties": {"id": property_id}}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
