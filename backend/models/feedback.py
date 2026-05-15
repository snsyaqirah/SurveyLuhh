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
    suggestedFix: Optional[str] = None


class FeedbackReplyRequest(BaseModel):
    reply: str


class Feedback(BaseModel):
    id: str
    category: FeedbackCategory
    message: str
    suggestedFix: Optional[str] = None
    createdAt: datetime
    reply: Optional[str] = None
    repliedAt: Optional[datetime] = None
    read: bool = False
