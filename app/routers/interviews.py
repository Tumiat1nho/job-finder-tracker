"""
Router para gerenciamento de entrevistas.
Contem endpoints para criar, listar, atualizar e deletar entrevistas.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Interview, Application, User
from ..schemas import InterviewCreate, InterviewUpdate, InterviewResponse, InterviewWithApplication
from ..auth import get_current_user

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.get("/", response_model=List[InterviewWithApplication])
def get_interviews(
    application_id: Optional[int] = Query(None, description="Filtrar por candidatura"),
    interview_status: Optional[str] = Query(None, description="Filtrar por status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todas as entrevistas do usuario autenticado.
    Pode ser filtrado por application_id ou status.
    Retorna entrevistas ordenadas por data (mais recentes primeiro).
    """
    query = (
        db.query(Interview)
        .join(Application)
        .filter(Application.user_id == current_user.id)
    )

    if application_id:
        query = query.filter(Interview.application_id == application_id)

    if interview_status:
        query = query.filter(Interview.status == interview_status)

    interviews = query.order_by(Interview.interview_datetime.desc()).all()

    result = []
    for interview in interviews:
        interview_dict = {
            "id": interview.id,
            "application_id": interview.application_id,
            "interview_datetime": interview.interview_datetime,
            "interview_type": interview.interview_type,
            "interviewer_name": interview.interviewer_name,
            "interviewer_role": interview.interviewer_role,
            "duration_minutes": interview.duration_minutes,
            "status": interview.status,
            "questions_asked": interview.questions_asked,
            "answers_notes": interview.answers_notes,
            "feedback_received": interview.feedback_received,
            "self_rating": interview.self_rating,
            "pre_interview_notes": interview.pre_interview_notes,
            "post_interview_notes": interview.post_interview_notes,
            "meeting_link": interview.meeting_link,
            "created_at": interview.created_at,
            "updated_at": interview.updated_at,
            "application_nome": interview.application.nome,
            "application_empresa": interview.application.empresa,
        }
        result.append(interview_dict)

    return result


@router.get("/upcoming", response_model=List[InterviewWithApplication])
def get_upcoming_interviews(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista as proximas entrevistas agendadas do usuario.
    """
    interviews = (
        db.query(Interview)
        .join(Application)
        .filter(
            Application.user_id == current_user.id,
            Interview.status == "scheduled",
            Interview.interview_datetime >= datetime.utcnow()
        )
        .order_by(Interview.interview_datetime.asc())
        .limit(limit)
        .all()
    )

    result = []
    for interview in interviews:
        interview_dict = {
            "id": interview.id,
            "application_id": interview.application_id,
            "interview_datetime": interview.interview_datetime,
            "interview_type": interview.interview_type,
            "interviewer_name": interview.interviewer_name,
            "interviewer_role": interview.interviewer_role,
            "duration_minutes": interview.duration_minutes,
            "status": interview.status,
            "questions_asked": interview.questions_asked,
            "answers_notes": interview.answers_notes,
            "feedback_received": interview.feedback_received,
            "self_rating": interview.self_rating,
            "pre_interview_notes": interview.pre_interview_notes,
            "post_interview_notes": interview.post_interview_notes,
            "meeting_link": interview.meeting_link,
            "created_at": interview.created_at,
            "updated_at": interview.updated_at,
            "application_nome": interview.application.nome,
            "application_empresa": interview.application.empresa,
        }
        result.append(interview_dict)

    return result


@router.post("/", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def create_interview(
    interview: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria uma nova entrevista para uma candidatura do usuario.
    Verifica se a candidatura pertence ao usuario autenticado.
    """
    application = (
        db.query(Application)
        .filter(
            Application.id == interview.application_id,
            Application.user_id == current_user.id
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidatura nao encontrada"
        )

    new_interview = Interview(**interview.model_dump())

    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return new_interview


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Busca uma entrevista especifica pelo ID.
    Retorna 404 se nao encontrada ou se pertencer a outro usuario.
    """
    interview = (
        db.query(Interview)
        .join(Application)
        .filter(
            Interview.id == interview_id,
            Application.user_id == current_user.id
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrevista nao encontrada"
        )

    return interview


@router.put("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    interview_update: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza uma entrevista existente.
    Apenas os campos fornecidos serao atualizados (patch parcial).
    """
    interview = (
        db.query(Interview)
        .join(Application)
        .filter(
            Interview.id == interview_id,
            Application.user_id == current_user.id
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrevista nao encontrada"
        )

    update_data = interview_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(interview, field, value)

    db.commit()
    db.refresh(interview)

    return interview


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deleta permanentemente uma entrevista do banco de dados.
    Retorna 404 se nao encontrada ou se pertencer a outro usuario.
    """
    interview = (
        db.query(Interview)
        .join(Application)
        .filter(
            Interview.id == interview_id,
            Application.user_id == current_user.id
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrevista nao encontrada"
        )

    db.delete(interview)
    db.commit()

    return None
