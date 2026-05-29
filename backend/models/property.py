from pydantic import BaseModel, Field, model_validator
from typing import Optional, Any
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
    url: str = ""
    title: str = ""
    price: str = ""
    images: list[str] = []
    details: PropertyDetails = Field(default_factory=PropertyDetails)
    facilities: list[str] = []
    nearbyPlaces: list[str] = []
    agent: PropertyAgent = Field(default_factory=PropertyAgent)
    description: str = ""
    status: PropertyStatus = PropertyStatus.none
    source: str = ""
    scrapedBy: str = ""
    addedAt: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode='before')
    @classmethod
    def coerce_none_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        for f in ('url', 'title', 'price', 'description', 'source', 'scrapedBy'):
            if data.get(f) is None:
                data[f] = ''
        for f in ('images', 'facilities', 'nearbyPlaces'):
            if data.get(f) is None:
                data[f] = []
        if data.get('details') is None:
            data['details'] = {}
        if data.get('agent') is None:
            data['agent'] = {}
        if data.get('status') is None:
            data['status'] = 'none'
        return data


class Member(BaseModel):
    nickname: str
    lastSeen: datetime = Field(default_factory=datetime.utcnow)
    consentGivenAt: Optional[datetime] = None
    tokenHash: Optional[str] = None


class BracketResult(BaseModel):
    nickname: str
    winnerId: str


class Session(BaseModel):
    id: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: Optional[datetime] = None
    extensionCount: int = 0
    properties: list[Property] = []
    members: list[Member] = []
    bracketResults: list[BracketResult] = []


class ScrapeRequest(BaseModel):
    url: str = Field(max_length=2048)
    sessionId: str = Field(max_length=100)
    recaptchaToken: str = Field(max_length=2048)
    nickname: str = Field(default="", max_length=50)


class ScrapeResponse(BaseModel):
    success: bool
    property: Optional[Property] = None
    error: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: PropertyStatus


class MemberRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=50)


class BracketResultRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=50)
    winnerId: str = Field(max_length=100)
    memberToken: Optional[str] = Field(default=None, max_length=100)
