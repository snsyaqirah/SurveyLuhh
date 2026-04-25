from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class PropertyStatus(str, Enum):
    none = "none"
    shortlisted = "shortlisted"
    rejected = "rejected"


class PropertyDetails(BaseModel):
    sqft: str = ""
    bedrooms: int = 0
    bathrooms: int = 0
    parking: int = 0


class PropertyAgent(BaseModel):
    name: str = ""
    phone: str = ""
    agency: str = ""


class Property(BaseModel):
    id: str
    url: str
    title: str
    price: str
    images: list[str] = []
    details: PropertyDetails = Field(default_factory=PropertyDetails)
    facilities: list[str] = []
    nearbyPlaces: list[str] = []
    agent: PropertyAgent = Field(default_factory=PropertyAgent)
    description: str = ""
    status: PropertyStatus = PropertyStatus.none
    source: str = ""
    addedAt: datetime = Field(default_factory=datetime.utcnow)


class Session(BaseModel):
    id: str
    createdAt: datetime
    properties: list[Property] = []


class ScrapeRequest(BaseModel):
    url: str
    sessionId: str
    recaptchaToken: str


class ScrapeResponse(BaseModel):
    success: bool
    property: Optional[Property] = None
    error: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: PropertyStatus
