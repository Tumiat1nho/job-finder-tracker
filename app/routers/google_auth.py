"""
Router para autenticação via Google OAuth (Firebase).
Permite login/registro usando conta Google através do Firebase Authentication.
"""

import json
import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

from ..database import get_db
from ..models import User
from ..auth import create_access_token

# Inicializa o Firebase Admin SDK
if not firebase_admin._apps:
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if service_account_json:
        cred = credentials.Certificate(json.loads(service_account_json))
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

router = APIRouter(prefix="/auth/google", tags=["Google Auth"])


class GoogleAuthRequest(BaseModel):
    """Schema de requisição contendo o ID token do Firebase."""
    id_token: str


class GoogleAuthResponse(BaseModel):
    """Schema de resposta com token JWT e dados do usuário."""
    access_token: str
    token_type: str
    user: dict


def verify_firebase_token(id_token: str) -> dict:
    """
    Verifica o ID token do Firebase usando o Firebase Admin SDK.

    Args:
        id_token: Token ID fornecido pelo Firebase Authentication

    Returns:
        Dicionário com dados do usuário (email, nome, foto, etc.)

    Raises:
        HTTPException: Se o token for inválido ou expirado
    """
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        return {
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture"),
            "sub": decoded_token.get("uid")
        }
    except firebase_admin.exceptions.FirebaseError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado"
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
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
    user_data = verify_firebase_token(auth_request.id_token)

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