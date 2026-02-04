"""
Router para servir configurações públicas do Firebase
"""
import os
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["Config"])


@router.get("/firebase-config")
def get_firebase_config():
    """
    Retorna configuração do Firebase para o frontend.
    
    As credenciais vêm das variáveis de ambiente do Railway.
    Essas informações são públicas e seguras de expor.
    """
    return {
        "apiKey": os.getenv("FIREBASE_API_KEY", ""),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.getenv("FIREBASE_PROJECT_ID", ""),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.getenv("FIREBASE_APP_ID", "")
    }