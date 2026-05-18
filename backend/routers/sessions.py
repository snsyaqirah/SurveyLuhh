from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid
import logging

from models.property import Session, Property, StatusUpdateRequest, MemberRequest, BracketResultRequest
from services.db import sessions_col

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", status_code=201)
async def create_session() -> dict:
    session_id = str(uuid.uuid4())
    doc = {
        "_id": session_id,
        "createdAt": datetime.now(timezone.utc),
        "properties": [],
        "members": [],
        "bracketResults": [],
    }
    await sessions_col().insert_one(doc)
    return {"sessionId": session_id}


@router.get("/{session_id}")
async def get_session(session_id: str) -> Session:
    doc = await sessions_col().find_one({"_id": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    doc["id"] = doc.pop("_id")
    doc.setdefault("members", [])
    doc.setdefault("bracketResults", [])
    doc.setdefault("createdAt", datetime.now(timezone.utc))

    # Parse properties individually so one bad doc doesn't break the session
    valid_props = []
    for raw in doc.get("properties", []):
        try:
            valid_props.append(Property(**raw).model_dump())
        except Exception as e:
            logger.warning("Skipping invalid property %s: %s", raw.get("id"), e)
    doc["properties"] = valid_props

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


@router.patch("/{session_id}/members", status_code=200)
async def register_member(session_id: str, body: MemberRequest) -> dict:
    now = datetime.now(timezone.utc)
    # Update lastSeen if member exists, otherwise push new member
    result = await sessions_col().update_one(
        {"_id": session_id, "members.nickname": body.nickname},
        {"$set": {"members.$.lastSeen": now}},
    )
    if result.matched_count == 0:
        await sessions_col().update_one(
            {"_id": session_id},
            {"$push": {"members": {"nickname": body.nickname, "lastSeen": now, "consentGivenAt": now}}},
            upsert=True,
        )
    return {"ok": True}


@router.patch("/{session_id}/bracket", status_code=200)
async def save_bracket_result(session_id: str, body: BracketResultRequest) -> dict:
    # Remove old result from this nickname, then push new one
    await sessions_col().update_one(
        {"_id": session_id},
        {"$pull": {"bracketResults": {"nickname": body.nickname}}},
    )
    await sessions_col().update_one(
        {"_id": session_id},
        {"$push": {"bracketResults": {"nickname": body.nickname, "winnerId": body.winnerId}}},
        upsert=True,
    )
    return {"ok": True}
