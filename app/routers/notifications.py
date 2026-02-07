"""
Router para notificacoes/lembretes de entrevistas.
Deriva notificacoes a partir dos dados existentes de entrevistas.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..database import get_db
from ..models import Interview, Application, User
from ..auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna lembretes de entrevistas agendadas, categorizados por:
    - today: entrevistas de hoje
    - tomorrow: entrevistas de amanha
    - this_week: entrevistas nos proximos 7 dias (excluindo hoje e amanha)
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    tomorrow_end = today_start + timedelta(days=2)
    week_end = today_start + timedelta(days=7)

    base_query = (
        db.query(Interview)
        .join(Application)
        .filter(
            Application.user_id == current_user.id,
            Interview.status == "scheduled",
            Interview.interview_datetime >= now
        )
    )

    today_interviews = (
        base_query
        .filter(Interview.interview_datetime < today_end)
        .order_by(Interview.interview_datetime.asc())
        .all()
    )

    tomorrow_interviews = (
        base_query
        .filter(
            Interview.interview_datetime >= today_end,
            Interview.interview_datetime < tomorrow_end
        )
        .order_by(Interview.interview_datetime.asc())
        .all()
    )

    week_interviews = (
        base_query
        .filter(
            Interview.interview_datetime >= tomorrow_end,
            Interview.interview_datetime < week_end
        )
        .order_by(Interview.interview_datetime.asc())
        .all()
    )

    def serialize(interview):
        return {
            "id": interview.id,
            "application_id": interview.application_id,
            "interview_datetime": interview.interview_datetime.isoformat(),
            "interview_type": interview.interview_type.value if interview.interview_type else None,
            "interviewer_name": interview.interviewer_name,
            "duration_minutes": interview.duration_minutes,
            "meeting_link": interview.meeting_link,
            "application_nome": interview.application.nome,
            "application_empresa": interview.application.empresa,
        }

    today_list = [serialize(i) for i in today_interviews]
    tomorrow_list = [serialize(i) for i in tomorrow_interviews]
    week_list = [serialize(i) for i in week_interviews]

    return {
        "today": today_list,
        "tomorrow": tomorrow_list,
        "this_week": week_list,
        "total_count": len(today_list) + len(tomorrow_list) + len(week_list),
    }
