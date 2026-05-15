import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from routers import sessions, scrape, feedback
from services.db import get_client

load_dotenv()

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address, default_limits=["5/minute"])

TTL_SECONDS = 604800  # 7 days


async def _ensure_sessions_ttl():
    from services.db import sessions_col
    col = sessions_col()
    try:
        info = await col.index_information()
        for name, idx in info.items():
            fields = [f for f, _ in idx.get("key", [])]
            if fields == ["createdAt"]:
                if idx.get("expireAfterSeconds") == TTL_SECONDS:
                    return  # already correct
                # Update TTL on the existing index via collMod
                await col.database.command(
                    "collMod", col.name,
                    index={"name": name, "expireAfterSeconds": TTL_SECONDS},
                )
                logger.info("Updated sessions TTL index to %ds", TTL_SECONDS)
                return
        # No createdAt index yet — create it
        await col.create_index("createdAt", expireAfterSeconds=TTL_SECONDS)
        logger.info("Created sessions TTL index (%ds)", TTL_SECONDS)
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

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(scrape.router)
app.include_router(feedback.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
