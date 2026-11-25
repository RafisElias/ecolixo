# Importa todos os modelos para registrar os mapeamentos do SQLAlchemy.
from app.models.disposal_point import DisposalPoint
from app.models.gamification import MissionCompletion, ScoreEvent
from app.models.notification import Notification
from app.models.pickup_service import PickupService
from app.models.report import Report
from app.models.user import User
from app.models.waste_category import WasteCategory

__all__ = [
    "DisposalPoint",
    "MissionCompletion",
    "Notification",
    "PickupService",
    "Report",
    "ScoreEvent",
    "User",
    "WasteCategory",
]
