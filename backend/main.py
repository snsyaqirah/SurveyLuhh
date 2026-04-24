import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from routers import sessions, scrape
from services.db import get_client

load_dotenv()

limiter = Limiter(key_func=get_remote_address, default_limits=["5/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up the DB connection on startup
    get_client()
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


@app.get("/health")
async def health():
    return {"status": "ok"}
