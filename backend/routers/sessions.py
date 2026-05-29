import hashlib
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel

from limiter import limiter
from models.property import Session, Property, StatusUpdateRequest, MemberRequest, BracketResultRequest
from services.db import sessions_col

SESSION_TTL_DAYS = 30


class ExtendRequest(BaseModel):
    days: int  # 7 or 30

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", status_code=201)
@limiter.limit("10/minute")
async def create_session(request: Request) -> dict:
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "_id": session_id,
        "createdAt": now,
        "expiresAt": now + timedelta(days=SESSION_TTL_DAYS),
        "extensionCount": 0,
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
    doc.setdefault("extensionCount", 0)

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
@limiter.limit("20/minute")
async def register_member(request: Request, session_id: str, body: MemberRequest) -> dict:
    now = datetime.now(timezone.utc)
    member_token = str(uuid.uuid4())
    token_hash = hashlib.sha256(member_token.encode()).hexdigest()

    result = await sessions_col().update_one(
        {"_id": session_id, "members.nickname": body.nickname},
        {"$set": {"members.$.lastSeen": now, "members.$.tokenHash": token_hash}},
    )
    if result.matched_count == 0:
        result2 = await sessions_col().update_one(
            {"_id": session_id},
            {"$push": {"members": {
                "nickname": body.nickname,
                "lastSeen": now,
                "consentGivenAt": now,
                "tokenHash": token_hash,
            }}},
        )
        if result2.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True, "memberToken": member_token}


@router.patch("/{session_id}/bracket", status_code=200)
@limiter.limit("30/minute")
async def save_bracket_result(request: Request, session_id: str, body: BracketResultRequest) -> dict:
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
    )
    return {"ok": True}


@router.post("/{session_id}/extend", status_code=200)
@limiter.limit("10/hour")
async def extend_session(request: Request, session_id: str, body: ExtendRequest) -> dict:
    if body.days not in (7, 30):
        raise HTTPException(status_code=400, detail="days must be 7 or 30")

    session = await sessions_col().find_one(
        {"_id": session_id}, {"expiresAt": 1, "extensionCount": 1}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    extension_count = session.get("extensionCount", 0)
    if extension_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum extensions (3) reached")

    expires_at = session.get("expiresAt")
    if not expires_at:
        raise HTTPException(status_code=400, detail="Session has no expiry date set")

    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    days_left = (expires_at - now).total_seconds() / 86400
    if days_left > 7:
        raise HTTPException(status_code=400, detail="Extensions available only in the last 7 days")

    new_expires_at = expires_at + timedelta(days=body.days)
    new_count = extension_count + 1

    await sessions_col().update_one(
        {"_id": session_id},
        {"$set": {"expiresAt": new_expires_at, "extensionCount": new_count}},
    )
    return {"ok": True, "expiresAt": new_expires_at.isoformat(), "extensionCount": new_count}


@router.post("/{session_id}/extend-admin", status_code=200)
async def extend_session_admin(session_id: str, authorization: str = Header(...)) -> dict:
    if authorization != f"Bearer {os.environ.get('ADMIN_TOKEN', '')}":
        raise HTTPException(status_code=403, detail="Forbidden")
    now = datetime.now(timezone.utc)
    result = await sessions_col().update_one(
        {"_id": session_id},
        {"$set": {"expiresAt": now + timedelta(days=SESSION_TTL_DAYS), "extensionCount": 0}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}
