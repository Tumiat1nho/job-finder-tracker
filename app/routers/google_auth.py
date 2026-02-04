"""
Router para autenticação via Google OAuth (Firebase).
Permite login/registro usando conta Google através do Firebase Authentication.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import httpx

from ..database import get_db
from ..models import User
from ..auth import create_access_token

router = APIRouter(prefix="/auth/google", tags=["Google Auth"])


class GoogleAuthRequest(BaseModel):
    """Schema de requisição contendo o ID token do Firebase."""
    id_token: str


class GoogleAuthResponse(BaseModel):
    """Schema de resposta com token JWT e dados do usuário."""
    access_token: str
    token_type: str
    user: dict


async def verify_firebase_token(id_token: str) -> dict:
    """
    Verifica o ID token do Firebase com a API do Google.

    Args:
        id_token: Token ID fornecido pelo Firebase Authentication

    Returns:
        Dicionário com dados do usuário (email, nome, foto, etc.)

    Raises:
        HTTPException: Se o token for inválido ou expirado
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={id_token}"
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token inválido ou expirado"
                )
            
            token_data = response.json()

            # Pega o Firebase Messaging Sender ID das variáveis de ambiente
            # (que é o mesmo que o aud esperado)
            expected_aud = os.getenv("FIREBASE_MESSAGING_SENDER_ID", "483077331516")
            
            if token_data.get("aud") != expected_aud:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token de projeto inválido"
                )
            
            return {
                "email": token_data.get("email"),
                "name": token_data.get("name"),
                "picture": token_data.get("picture"),
                "sub": token_data.get("sub")
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Erro ao verificar token com Google"
        )


@router.post("/login", response_model=GoogleAuthResponse)
async def google_login(
    auth_request: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Login/Registro com Google via Firebase.
    Verifica o token, busca ou cria o usuário, e retorna um token JWT.
    """
    user_data = await verify_firebase_token(auth_request.id_token)

    email = user_data["email"]

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            email=email,
            hashed_password="",
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token_expires = timedelta(days=7)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user_data.get("name"),
            "picture": user_data.get("picture")
        }
    }