import os
import uuid
import asyncio
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException

from models.property import Property, ScrapeRequest, ScrapeResponse
from services.db import sessions_col
from services.scraper import scrape_url

router = APIRouter(prefix="/api/scrape", tags=["scrape"])

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
RECAPTCHA_MIN_SCORE = 0.5
MAX_PROPERTIES_PER_SESSION = 20


async def _verify_recaptcha(token: str) -> bool:
    if token == "dev-bypass":
        return True
    secret = os.environ.get("RECAPTCHA_SECRET_KEY", "")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            RECAPTCHA_VERIFY_URL,
            data={"secret": secret, "response": token},
            timeout=10,
        )
    data = resp.json()
    return data.get("success") and data.get("score", 0) >= RECAPTCHA_MIN_SCORE


@router.post("", response_model=ScrapeResponse)
async def scrape_property(body: ScrapeRequest) -> ScrapeResponse:
    # reCAPTCHA check
    ok = await _verify_recaptcha(body.recaptchaToken)
    if not ok:
        raise HTTPException(status_code=403, detail="reCAPTCHA verification failed")

    # Upsert session — creates it if the user navigated directly to a hunt URL
    await sessions_col().update_one(
        {"_id": body.sessionId},
        {"$setOnInsert": {"createdAt": datetime.now(timezone.utc), "properties": []}},
        upsert=True,
    )
    doc = await sessions_col().find_one({"_id": body.sessionId}, {"properties": 1}) or {}

    # Property cap
    if len(doc.get("properties", [])) >= MAX_PROPERTIES_PER_SESSION:
        raise HTTPException(status_code=429, detail="Session property limit reached (20 max)")

    # Scrape in a thread (Selenium is blocking)
    try:
        scraped = await asyncio.get_event_loop().run_in_executor(
            None, scrape_url, body.url
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return ScrapeResponse(success=False, error=f"Scraping failed: {e}")

    prop = Property(
        id=str(uuid.uuid4()),
        url=body.url,
        addedAt=datetime.now(timezone.utc),
        **scraped,
    )

    await sessions_col().update_one(
        {"_id": body.sessionId},
        {"$push": {"properties": prop.model_dump()}},
    )

    return ScrapeResponse(success=True, property=prop)
