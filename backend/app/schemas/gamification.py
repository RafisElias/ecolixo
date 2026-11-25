from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.disposal_point import ReviewStatus


class OptionOut(BaseModel):
    id: str
    text: str


class QuestionOut(BaseModel):
    id: str
    prompt: str
    options: list[OptionOut]


class MissionOut(BaseModel):
    key: str
    title: str
    summary: str
    content: list[str]
    questions: list[QuestionOut]
    points: int
    completed: bool


class MissionAnswer(BaseModel):
    # question_id -> option_id
    answers: dict[str, str] = Field(max_length=20)


class MissionResult(BaseModel):
    passed: bool
    already_completed: bool
    points_awarded: int
    incorrect_question_ids: list[str]


class AchievementOut(BaseModel):
    key: str
    title: str
    description: str
    unlocked: bool
    progress: int
    goal: int


class ScoreEventOut(BaseModel):
    id: int
    reason: Literal["mission_completed", "contribution_approved"]
    description: str
    points: int
    created_at: datetime
    revoked_at: datetime | None


class ContributionCounts(BaseModel):
    pending: int = 0
    approved: int = 0
    rejected: int = 0


class JourneyOut(BaseModel):
    balance: int
    missions_completed: int
    missions_total: int
    contributions: ContributionCounts
    achievements: list[AchievementOut]
    history: list[ScoreEventOut]


class ReviewUpdate(BaseModel):
    review_status: ReviewStatus
