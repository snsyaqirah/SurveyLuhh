from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional


class FeedbackCategory(str, Enum):
    bug = "bug"
    enhancement = "enhancement"
    general = "general"
    testimonial = "testimonial"


class FeedbackSubmitRequest(BaseModel):
    category: FeedbackCategory
    message: str


class FeedbackReplyRequest(BaseModel):
    reply: str


class Feedback(BaseModel):
    id: str
    category: FeedbackCategory
    message: str
    createdAt: datetime
    reply: Optional[str] = None
    repliedAt: Optional[datetime] = None
    read: bool = False
