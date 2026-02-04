import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Obtém a URL de conexão do banco de dados das variáveis de ambiente
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL não definida")

# Corrige o esquema postgres:// para postgresql:// (compatibilidade Railway/Heroku)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}

# Configuração específica para SQLite (permite uso em múltiplas threads)
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Cria o engine de conexão com o banco de dados
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True  # Verifica conexões antes de usar
)

# Fabrica de sessões do SQLAlchemy
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Classe base para os modelos do SQLAlchemy
Base = declarative_base()

def get_db():
    """
    Dependency function que fornece uma sessão de banco de dados.
    Garante que a sessão seja fechada após o uso.

    Yields:
        Session: Sessão do banco de dados SQLAlchemy
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
