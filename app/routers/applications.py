from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Application, User
from ..schemas import ApplicationCreate, ApplicationUpdate, ApplicationResponse
from ..auth import get_current_user

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("/", response_model=List[ApplicationResponse])
def get_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Listar todas as candidaturas do usuário logado

    Retorna lista de todas as candidaturas ordenadas por data de criação (mais recente primeiro)
    """
    applications = (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    return applications


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    application: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Criar nova candidatura

    - **nome**: Nome da vaga
    - **empresa**: Nome da empresa
    - **data**: Data da candidatura (formato YYYY-MM-DD)
    - **role**: Cargo/função
    - **status**: esperando, rejeitado ou entrevista (padrão: esperando)
    - **chance**: Chance de sucesso 0-100 (padrão: 50)
    """
    new_application = Application(
        **application.model_dump(),
        user_id=current_user.id
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return new_application


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Buscar candidatura específica por ID

    Retorna apenas candidaturas do usuário logado
    """
    application = (
        db.query(Application)
        .filter(
            Application.id == application_id,
            Application.user_id == current_user.id
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidatura não encontrada"
        )

    return application


@router.put("/{application_id}", response_model=ApplicationResponse)
def update_application(
    application_id: int,
    application_update: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualizar candidatura existente

    Apenas campos fornecidos serão atualizados

    - **nome**: Nome da vaga (opcional)
    - **empresa**: Nome da empresa (opcional)
    - **data**: Data da candidatura (opcional)
    - **role**: Cargo/função (opcional)
    - **status**: esperando, rejeitado ou entrevista (opcional)
    - **chance**: Chance de sucesso 0-100 (opcional)
    """
    application = (
        db.query(Application)
        .filter(
            Application.id == application_id,
            Application.user_id == current_user.id
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidatura não encontrada"
        )

    update_data = application_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(application, field, value)

    db.commit()
    db.refresh(application)

    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletar candidatura

    Remove permanentemente a candidatura do banco de dados
    """
    application = (
        db.query(Application)
        .filter(
            Application.id == application_id,
            Application.user_id == current_user.id
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidatura não encontrada"
        )

    db.delete(application)
    db.commit()

    return None
