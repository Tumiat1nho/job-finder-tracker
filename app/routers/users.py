from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from ..database import get_db
from ..models import User, Application, StatusEnum
from ..auth import get_current_user, verify_password, get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])


class UserMeResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)
    confirm_new_password: str = Field(min_length=6)


class UserStatsResponse(BaseModel):
    """Estatísticas do usuário"""
    total: int
    esperando: int
    entrevista: int
    rejeitado: int
    taxa_conversao: float
    empresa_top: str | None
    empresa_top_count: int
    primeira_candidatura: str | None
    ultima_entrevista: str | None
    mes_mais_ativo: str | None
    mes_mais_ativo_count: int


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Obter informações do usuário atual
    """
    return current_user


@router.get("/me/stats", response_model=UserStatsResponse)
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obter estatísticas das candidaturas do usuário
    
    Retorna:
    - Total de candidaturas
    - Contagem por status
    - Taxa de conversão
    - Empresa mais candidatada
    - Primeira candidatura
    - Última entrevista
    - Mês mais ativo
    """
    # Total por status
    stats = db.query(
        func.count(Application.id).label('total'),
        func.sum(func.cast(Application.status == StatusEnum.ESPERANDO, db.bind.dialect.name == 'postgresql' and 'INTEGER' or 'INT')).label('esperando'),
        func.sum(func.cast(Application.status == StatusEnum.ENTREVISTA, db.bind.dialect.name == 'postgresql' and 'INTEGER' or 'INT')).label('entrevista'),
        func.sum(func.cast(Application.status == StatusEnum.REJEITADO, db.bind.dialect.name == 'postgresql' and 'INTEGER' or 'INT')).label('rejeitado')
    ).filter(Application.user_id == current_user.id).first()
    
    total = stats.total or 0
    esperando = stats.esperando or 0
    entrevista = stats.entrevista or 0
    rejeitado = stats.rejeitado or 0
    
    # Taxa de conversão (entrevistas / total)
    taxa_conversao = round((entrevista / total * 100), 1) if total > 0 else 0.0
    
    # Empresa mais candidatada
    empresa_top_query = db.query(
        Application.empresa,
        func.count(Application.id).label('count')
    ).filter(
        Application.user_id == current_user.id
    ).group_by(
        Application.empresa
    ).order_by(
        func.count(Application.id).desc()
    ).first()
    
    empresa_top = empresa_top_query[0] if empresa_top_query else None
    empresa_top_count = empresa_top_query[1] if empresa_top_query else 0
    
    # Primeira candidatura
    primeira = db.query(Application.data).filter(
        Application.user_id == current_user.id
    ).order_by(Application.created_at.asc()).first()
    
    primeira_candidatura = primeira[0] if primeira else None
    
    # Última entrevista
    ultima = db.query(Application.data).filter(
        Application.user_id == current_user.id,
        Application.status == StatusEnum.ENTREVISTA
    ).order_by(Application.updated_at.desc()).first()
    
    ultima_entrevista = ultima[0] if ultima else None
    
    # Mês mais ativo (baseado em created_at)
    mes_query = db.query(
        func.strftime('%Y-%m', Application.created_at).label('mes'),
        func.count(Application.id).label('count')
    ).filter(
        Application.user_id == current_user.id
    ).group_by('mes').order_by(func.count(Application.id).desc()).first()
    
    mes_mais_ativo = mes_query[0] if mes_query else None
    mes_mais_ativo_count = mes_query[1] if mes_query else 0
    
    return {
        "total": total,
        "esperando": esperando,
        "entrevista": entrevista,
        "rejeitado": rejeitado,
        "taxa_conversao": taxa_conversao,
        "empresa_top": empresa_top,
        "empresa_top_count": empresa_top_count,
        "primeira_candidatura": primeira_candidatura,
        "ultima_entrevista": ultima_entrevista,
        "mes_mais_ativo": mes_mais_ativo,
        "mes_mais_ativo_count": mes_mais_ativo_count
    }


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Alterar senha do usuário
    """
    # Confirmação
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="As senhas novas não coincidem",
        )

    # Verifica senha atual
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha atual incorreta",
        )

    # Evita trocar pela mesma senha
    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha não pode ser igual à senha atual",
        )

    # Atualiza senha
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()

    return None