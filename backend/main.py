import os
import logging
from contextlib import asynccontextmanager

import sentry_sdk

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from limiter import limiter
from dotenv import load_dotenv

from routers import sessions, scrape, feedback
from services.db import get_client

load_dotenv()

sentry_sdk.init(
    dsn="https://970f25a25e6475bdbbe3affc6616156d@o4511411898548224.ingest.us.sentry.io/4511411903463424",
    traces_sample_rate=0.1,
    send_default_pii=False,
)

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


async def _ensure_sessions_ttl():
    from services.db import sessions_col
    col = sessions_col()
    try:
        info = await col.index_information()

        # Drop legacy createdAt TTL index if present
        for name, idx in info.items():
            fields = [f for f, _ in idx.get("key", [])]
            if fields == ["createdAt"] and "expireAfterSeconds" in idx:
                await col.drop_index(name)
                logger.info("Dropped legacy createdAt TTL index")
                break

        # Ensure expiresAt TTL index (expireAfterSeconds=0 means delete when field < now)
        info = await col.index_information()
        for idx in info.values():
            fields = [f for f, _ in idx.get("key", [])]
            if fields == ["expiresAt"] and idx.get("expireAfterSeconds") == 0:
                return  # already correct
        await col.create_index("expiresAt", expireAfterSeconds=0, sparse=True)
        logger.info("Created sessions TTL index on expiresAt")
    except Exception as exc:
        logger.warning("TTL index setup failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_client()
    await _ensure_sessions_ttl()
    yield
    get_client().close()


app = FastAPI(title="SurveyLuhh API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

allowed_origins = [o.strip().rstrip("/") for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(sessions.router)
app.include_router(scrape.router)
app.include_router(feedback.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
