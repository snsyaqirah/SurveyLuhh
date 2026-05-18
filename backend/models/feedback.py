from pydantic import BaseModel, Field
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
    message: str = Field(min_length=1, max_length=5000)
    suggestedFix: Optional[str] = Field(default=None, max_length=2000)


class FeedbackReplyRequest(BaseModel):
    reply: str = Field(min_length=1, max_length=5000)


class Feedback(BaseModel):
    id: str
    category: FeedbackCategory
    message: str
    suggestedFix: Optional[str] = None
    createdAt: datetime
    reply: Optional[str] = None
    repliedAt: Optional[datetime] = None
    read: bool = False
