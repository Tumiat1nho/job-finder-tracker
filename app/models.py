from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base


class StatusEnum(str, enum.Enum):
    """
    Enum para os possíveis status de uma candidatura.

    Values:
        ESPERANDO: Candidatura enviada, aguardando resposta
        REJEITADO: Candidatura rejeitada pela empresa
        ENTREVISTA: Candidato foi chamado para entrevista
    """
    ESPERANDO = "esperando"
    REJEITADO = "rejeitado"
    ENTREVISTA = "entrevista"


class User(Base):
    """
    Modelo de usuário do sistema.

    Attributes:
        id: Identificador único do usuário
        email: Email do usuário (único e indexado)
        hashed_password: Senha hasheada com bcrypt
        created_at: Data e hora de criação da conta
        applications: Relação com as candidaturas do usuário
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento 1:N com Application (um usuário tem várias candidaturas)
    applications = relationship("Application", back_populates="owner", cascade="all, delete-orphan")


class Application(Base):
    """
    Modelo de candidatura de emprego.

    Attributes:
        id: Identificador único da candidatura
        nome: Nome/título da vaga
        empresa: Nome da empresa
        data: Data da candidatura (formato YYYY-MM-DD)
        status: Status atual da candidatura (esperando, rejeitado, entrevista)
        chance: Percentual estimado de sucesso (0-100)
        role: Cargo/função da vaga
        created_at: Data e hora de criação do registro
        updated_at: Data e hora da última atualização
        user_id: ID do usuário dono desta candidatura
        owner: Relação com o usuário dono
    """
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)  # Nome da vaga
    empresa = Column(String, nullable=False)  # Nome da empresa
    data = Column(String, nullable=False)  # Data da candidatura
    status = Column(SQLEnum(StatusEnum), default=StatusEnum.ESPERANDO)  # Status atual
    chance = Column(Integer, default=50)  # Chance de sucesso (0-100)
    role = Column(String, nullable=False)  # Cargo/função
    created_at = Column(DateTime, default=datetime.utcnow)  # Data de criação
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Última atualização

    # Chave estrangeira para o usuário
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relacionamento N:1 com User (várias candidaturas pertencem a um usuário)
    owner = relationship("User", back_populates="applications")