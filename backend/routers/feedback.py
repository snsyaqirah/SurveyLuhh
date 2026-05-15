import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from models.feedback import Feedback, FeedbackReplyRequest, FeedbackSubmitRequest
from services.db import feedback_col

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


def _require_admin(authorization: Optional[str] = Header(None)):
    token = os.environ.get("ADMIN_TOKEN", "")
    if not token or authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("", status_code=201)
async def submit_feedback(body: FeedbackSubmitRequest) -> dict:
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    doc = {
        "_id": str(uuid.uuid4()),
        "category": body.category,
        "message": body.message.strip(),
        "createdAt": datetime.now(timezone.utc),
        "reply": None,
        "repliedAt": None,
        "read": False,
    }
    await feedback_col().insert_one(doc)
    return {"ok": True}


@router.get("/unread-count", dependencies=[Depends(_require_admin)])
async def unread_count() -> dict:
    count = await feedback_col().count_documents({"read": False})
    return {"count": count}


@router.get("", dependencies=[Depends(_require_admin)])
async def list_feedback() -> list[dict]:
    docs = await feedback_col().find().sort("createdAt", -1).to_list(None)
    await feedback_col().update_many({"read": False}, {"$set": {"read": True}})
    result = []
    for doc in docs:
        doc["id"] = doc.pop("_id")
        result.append(doc)
    return result


@router.patch("/{feedback_id}/reply", status_code=200, dependencies=[Depends(_require_admin)])
async def reply_to_feedback(feedback_id: str, body: FeedbackReplyRequest) -> dict:
    result = await feedback_col().update_one(
        {"_id": feedback_id},
        {"$set": {"reply": body.reply.strip(), "repliedAt": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"ok": True}
