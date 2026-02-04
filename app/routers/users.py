"""
Router para gerenciamento de usuários e perfil.
Contém endpoints para visualizar perfil, estatísticas e alterar senha.
"""

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
    """Schema de resposta com informações básicas do usuário."""
    id: int
    email: str

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    """Schema para requisição de alteração de senha."""
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)
    confirm_new_password: str = Field(min_length=6)


class UserStatsResponse(BaseModel):
    """Schema de resposta com estatísticas detalhadas das candidaturas do usuário."""
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
    """Retorna informações básicas do usuário autenticado."""
    return current_user


@router.get("/me/stats", response_model=UserStatsResponse)
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna estatísticas completas das candidaturas do usuário.
    Inclui totais por status, taxa de conversão, empresa top, primeira candidatura, etc.
    """
    total = db.query(Application).filter(
        Application.user_id == current_user.id
    ).count()

    esperando = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.status == StatusEnum.ESPERANDO
    ).count()
    
    entrevista = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.status == StatusEnum.ENTREVISTA
    ).count()
    
    rejeitado = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.status == StatusEnum.REJEITADO
    ).count()

    taxa_conversao = round((entrevista / total * 100), 1) if total > 0 else 0.0

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

    primeira = db.query(Application.data).filter(
        Application.user_id == current_user.id
    ).order_by(Application.created_at.asc()).first()
    
    primeira_candidatura = primeira[0] if primeira else None

    ultima = db.query(Application.data).filter(
        Application.user_id == current_user.id,
        Application.status == StatusEnum.ENTREVISTA
    ).order_by(Application.updated_at.desc()).first()
    
    ultima_entrevista = ultima[0] if ultima else None

    try:
        if db.bind.dialect.name == 'postgresql':
            mes_query = db.query(
                func.to_char(Application.created_at, 'YYYY-MM').label('mes'),
                func.count(Application.id).label('count')
            ).filter(
                Application.user_id == current_user.id
            ).group_by(func.to_char(Application.created_at, 'YYYY-MM')).order_by(
                func.count(Application.id).desc()
            ).first()
        else:
            mes_query = db.query(
                func.strftime('%Y-%m', Application.created_at).label('mes'),
                func.count(Application.id).label('count')
            ).filter(
                Application.user_id == current_user.id
            ).group_by(func.strftime('%Y-%m', Application.created_at)).order_by(
                func.count(Application.id).desc()
            ).first()
        
        mes_mais_ativo = mes_query[0] if mes_query else None
        mes_mais_ativo_count = mes_query[1] if mes_query else 0
    except Exception as e:
        print(f"Erro ao calcular mês mais ativo: {e}")
        mes_mais_ativo = None
        mes_mais_ativo_count = 0
    
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
    Altera a senha do usuário autenticado.
    Valida senha atual, confirma nova senha e garante que não seja igual à antiga.
    """
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="As senhas novas não coincidem",
        )

    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha atual incorreta",
        )

    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha não pode ser igual à senha atual",
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()

    return None