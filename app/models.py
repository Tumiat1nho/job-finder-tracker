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


class InterviewTypeEnum(str, enum.Enum):
    """
    Enum para os tipos de entrevista.
    """
    PHONE = "phone"
    VIDEO = "video"
    IN_PERSON = "in_person"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    HR = "hr"


class InterviewStatusEnum(str, enum.Enum):
    """
    Enum para o status da entrevista.
    """
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


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

    # Relacionamento 1:N com Interview (uma candidatura pode ter várias entrevistas)
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")


class Interview(Base):
    """
    Modelo de entrevista de emprego.

    Attributes:
        id: Identificador único da entrevista
        application_id: ID da candidatura relacionada
        interview_datetime: Data e hora da entrevista
        interview_type: Tipo da entrevista (phone, video, in_person, technical, behavioral, hr)
        interviewer_name: Nome do entrevistador
        interviewer_role: Cargo/função do entrevistador
        duration_minutes: Duração estimada/real em minutos
        status: Status da entrevista (scheduled, completed, cancelled, rescheduled)
        questions_asked: Perguntas feitas durante a entrevista
        answers_notes: Notas sobre respostas/discussões
        feedback_received: Feedback recebido após entrevista
        self_rating: Autoavaliação de 1 a 5
        pre_interview_notes: Notas de preparação antes da entrevista
        post_interview_notes: Notas/reflexões após a entrevista
        meeting_link: Link para reunião online
        created_at: Data de criação do registro
        updated_at: Data da última atualização
    """
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)

    # Detalhes básicos da entrevista
    interview_datetime = Column(DateTime, nullable=False)
    interview_type = Column(SQLEnum(InterviewTypeEnum), nullable=False)
    interviewer_name = Column(String, nullable=True)
    interviewer_role = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    status = Column(SQLEnum(InterviewStatusEnum), default=InterviewStatusEnum.SCHEDULED)

    # Campos de conteúdo
    questions_asked = Column(String, nullable=True)
    answers_notes = Column(String, nullable=True)
    feedback_received = Column(String, nullable=True)
    self_rating = Column(Integer, nullable=True)

    # Campos de preparação
    pre_interview_notes = Column(String, nullable=True)
    post_interview_notes = Column(String, nullable=True)
    meeting_link = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamento N:1 com Application
    application = relationship("Application", back_populates="interviews")