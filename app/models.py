from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base


class StatusEnum(str, enum.Enum):
    """Status da candidatura"""
    ESPERANDO = "esperando"
    REJEITADO = "rejeitado"
    ENTREVISTA = "entrevista"


class User(Base):
    """Modelo de Usuário"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento com candidaturas
    applications = relationship("Application", back_populates="owner", cascade="all, delete-orphan")


class Application(Base):
    """Modelo de Candidatura"""
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)  # Nome da vaga
    empresa = Column(String, nullable=False)
    data = Column(String, nullable=False)  # Data da candidatura
    status = Column(SQLEnum(StatusEnum), default=StatusEnum.ESPERANDO)
    chance = Column(Integer, default=50)  # 0-100
    role = Column(String, nullable=False)  # Cargo
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Key
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relacionamento
    owner = relationship("User", back_populates="applications")