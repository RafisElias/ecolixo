"""Regras de pontuação. Todo cálculo acontece aqui, nunca no cliente.

- Missão: pontua uma única vez, somente com todas as respostas corretas.
- Contribuição: pontua quando um gestor aprova o cadastro; a pontuação é
  revogada (não apagada) se a aprovação for desfeita.
- Saldo: soma dos eventos não revogados.
"""

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.disposal_point import DisposalPoint, ReviewStatus
from app.models.gamification import POINTS_CONTRIBUTION, POINTS_MISSION, MissionCompletion, ScoreEvent
from app.schemas.gamification import (
    AchievementOut,
    ContributionCounts,
    JourneyOut,
    MissionAnswer,
    MissionOut,
    MissionResult,
    OptionOut,
    QuestionOut,
    ScoreEventOut,
)
from app.services.missions import MISSIONS, MISSIONS_BY_KEY, Mission

MISSION = "mission_completed"
CONTRIBUTION = "contribution_approved"
DEMO_PREFIX = "[DEMO]"
MAP_COLLABORATOR_GOAL = 5
HISTORY_LIMIT = 50


def is_demo(point: DisposalPoint) -> bool:
    return (point.description or "").lstrip().upper().startswith(DEMO_PREFIX)


async def _award(db: AsyncSession, user_id: int, reason: str, source_key: str, points: int) -> bool:
    """Cria o evento se não houver um ativo para a mesma origem. Retorna se criou."""
    stmt = (
        insert(ScoreEvent)
        .values(user_id=user_id, reason=reason, source_key=source_key, points=points)
        .on_conflict_do_nothing(
            index_elements=["user_id", "reason", "source_key"],
            index_where=ScoreEvent.revoked_at.is_(None),
        )
        .returning(ScoreEvent.id)
    )
    return (await db.execute(stmt)).scalar_one_or_none() is not None


async def _revoke(db: AsyncSession, user_id: int, reason: str, source_key: str) -> None:
    await db.execute(
        update(ScoreEvent)
        .where(
            ScoreEvent.user_id == user_id,
            ScoreEvent.reason == reason,
            ScoreEvent.source_key == source_key,
            ScoreEvent.revoked_at.is_(None),
        )
        .values(revoked_at=func.now())
    )


async def sync_contribution_score(db: AsyncSession, point: DisposalPoint) -> None:
    """Alinha a pontuação da contribuição ao review_status atual. Idempotente; não faz commit."""
    source_key = str(point.id)
    if point.review_status == ReviewStatus.approved.value and not is_demo(point):
        await _award(db, point.user_id, CONTRIBUTION, source_key, POINTS_CONTRIBUTION)
    else:
        await _revoke(db, point.user_id, CONTRIBUTION, source_key)


async def _completed_keys(db: AsyncSession, user_id: int) -> set[str]:
    result = await db.execute(select(MissionCompletion.mission_key).where(MissionCompletion.user_id == user_id))
    return set(result.scalars().all())


def _mission_out(mission: Mission, completed: bool) -> MissionOut:
    return MissionOut(
        key=mission.key,
        title=mission.title,
        summary=mission.summary,
        content=list(mission.content),
        questions=[
            QuestionOut(
                id=q.id,
                prompt=q.prompt,
                options=[OptionOut(id=o.id, text=o.text) for o in q.options],
            )
            for q in mission.questions
        ],
        points=POINTS_MISSION,
        completed=completed,
    )


async def list_missions(db: AsyncSession, user_id: int) -> list[MissionOut]:
    done = await _completed_keys(db, user_id)
    return [_mission_out(m, m.key in done) for m in MISSIONS]


async def complete_mission(db: AsyncSession, user_id: int, mission_key: str, body: MissionAnswer) -> MissionResult:
    mission = MISSIONS_BY_KEY.get(mission_key)
    if mission is None:
        raise HTTPException(404, "Missão não encontrada")

    incorrect = [q.id for q in mission.questions if body.answers.get(q.id) != q.correct_option_id]
    if incorrect:
        return MissionResult(passed=False, already_completed=False, points_awarded=0, incorrect_question_ids=incorrect)

    inserted = await db.execute(
        insert(MissionCompletion)
        .values(user_id=user_id, mission_key=mission.key)
        .on_conflict_do_nothing(index_elements=["user_id", "mission_key"])
        .returning(MissionCompletion.mission_key)
    )
    if inserted.scalar_one_or_none() is None:
        return MissionResult(passed=True, already_completed=True, points_awarded=0, incorrect_question_ids=[])

    awarded = await _award(db, user_id, MISSION, mission.key, POINTS_MISSION)
    await db.commit()
    return MissionResult(
        passed=True,
        already_completed=False,
        points_awarded=POINTS_MISSION if awarded else 0,
        incorrect_question_ids=[],
    )


def _describe(event: ScoreEvent) -> str:
    if event.reason == MISSION:
        mission = MISSIONS_BY_KEY.get(event.source_key)
        return f"Missão concluída: {mission.title if mission else event.source_key}"
    return f"Contribuição #{event.source_key} aprovada"


def _achievement(key: str, title: str, description: str, progress: int, goal: int) -> AchievementOut:
    return AchievementOut(
        key=key,
        title=title,
        description=description,
        unlocked=progress >= goal,
        progress=min(progress, goal),
        goal=goal,
    )


async def get_journey(db: AsyncSession, user_id: int) -> JourneyOut:
    events = list(
        (
            await db.execute(
                select(ScoreEvent)
                .where(ScoreEvent.user_id == user_id)
                .order_by(ScoreEvent.created_at.desc(), ScoreEvent.id.desc())
            )
        )
        .scalars()
        .all()
    )
    active = [e for e in events if e.revoked_at is None]
    approved = sum(1 for e in active if e.reason == CONTRIBUTION)

    done = await _completed_keys(db, user_id) & MISSIONS_BY_KEY.keys()
    total = len(MISSIONS)

    rows = await db.execute(
        select(DisposalPoint.review_status, func.count())
        .where(DisposalPoint.user_id == user_id)
        .group_by(DisposalPoint.review_status)
    )
    counts = ContributionCounts(**{status: n for status, n in rows.all()})

    return JourneyOut(
        balance=sum(e.points for e in active),
        missions_completed=len(done),
        missions_total=total,
        contributions=counts,
        achievements=[
            _achievement(
                "primeiro-aprendizado", "Primeiro aprendizado", "Conclua sua primeira missão educativa.", len(done), 1
            ),
            _achievement(
                "aprendiz-descarte-consciente",
                "Aprendiz do descarte consciente",
                "Conclua todas as missões educativas.",
                len(done),
                total,
            ),
            _achievement(
                "primeira-contribuicao",
                "Primeira contribuição",
                "Tenha um ponto de coleta aprovado pela gestão.",
                approved,
                1,
            ),
            _achievement(
                "colaborador-do-mapa",
                "Colaborador do mapa",
                f"Tenha {MAP_COLLABORATOR_GOAL} pontos de coleta aprovados.",
                approved,
                MAP_COLLABORATOR_GOAL,
            ),
        ],
        history=[
            ScoreEventOut(
                id=e.id,
                reason=e.reason,
                description=_describe(e),
                points=e.points,
                created_at=e.created_at,
                revoked_at=e.revoked_at,
            )
            for e in events[:HISTORY_LIMIT]
        ],
    )
