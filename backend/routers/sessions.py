import hashlib
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

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

    valid_props = []
    for raw in doc.get("properties", []):
        try:
            valid_props.append(Property(**raw).model_dump())
        except Exception as e:
            logger.warning("Skipping invalid property %s: %s", raw.get("id"), e)
    doc["properties"] = valid_props

    return Session(**doc)


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str):
    result = await sessions_col().delete_one({"_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")


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
    member_token = str(uuid.uuid4())
    token_hash = hashlib.sha256(member_token.encode()).hexdigest()

    result = await sessions_col().update_one(
        {"_id": session_id, "members.nickname": body.nickname},
        {"$set": {"members.$.lastSeen": now, "members.$.tokenHash": token_hash}},
    )
    if result.matched_count == 0:
        await sessions_col().update_one(
            {"_id": session_id},
            {"$push": {"members": {
                "nickname": body.nickname,
                "lastSeen": now,
                "consentGivenAt": now,
                "tokenHash": token_hash,
            }}},
            upsert=True,
        )
    return {"ok": True, "memberToken": member_token}


@router.patch("/{session_id}/bracket", status_code=200)
async def save_bracket_result(session_id: str, body: BracketResultRequest) -> dict:
    if body.memberToken:
        token_hash = hashlib.sha256(body.memberToken.encode()).hexdigest()
        match = await sessions_col().find_one(
            {"_id": session_id, "members": {"$elemMatch": {"nickname": body.nickname, "tokenHash": token_hash}}},
        )
        if not match:
            raise HTTPException(status_code=403, detail="Invalid member token")
    else:
        # No token supplied — only allow if this nickname has no token set (old sessions / pre-token members)
        session = await sessions_col().find_one({"_id": session_id})
        if session:
            members = session.get("members", [])
            member = next((m for m in members if m.get("nickname") == body.nickname), None)
            if member and member.get("tokenHash"):
                raise HTTPException(status_code=403, detail="Member token required")

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
