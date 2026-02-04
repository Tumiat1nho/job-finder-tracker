from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from .models import StatusEnum


# ========== SCHEMAS DE USUÁRIO ==========

class UserBase(BaseModel):
    """Schema base para usuário contendo apenas o email."""
    email: EmailStr


class UserCreate(UserBase):
    """Schema para criação de novo usuário (registro)."""
    password: str = Field(..., min_length=6, description="Senha deve ter no mínimo 6 caracteres")


class UserLogin(UserBase):
    """Schema para login de usuário."""
    password: str


class UserResponse(UserBase):
    """Schema de resposta com dados do usuário (sem a senha)."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========== SCHEMAS DE TOKEN JWT ==========

class Token(BaseModel):
    """Schema de resposta contendo o token JWT de acesso."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema para dados extraídos do token JWT."""
    email: Optional[str] = None


# ========== SCHEMAS DE CANDIDATURA ==========

class ApplicationBase(BaseModel):
    """Schema base para candidatura com todos os campos necessários."""
    nome: str = Field(..., min_length=1, description="Nome da vaga")
    empresa: str = Field(..., min_length=1, description="Nome da empresa")
    data: str = Field(..., description="Data da candidatura (ex: 2024-01-15)")
    role: str = Field(..., min_length=1, description="Cargo/função")
    status: StatusEnum = Field(default=StatusEnum.ESPERANDO)
    chance: int = Field(default=50, ge=0, le=100, description="Chance de sucesso (0-100)")

    @validator('data')
    def validate_data(cls, v):
        """Valida se a data está no formato YYYY-MM-DD."""
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Data deve estar no formato YYYY-MM-DD (ex: 2024-01-15)')


class ApplicationCreate(ApplicationBase):
    """Schema para criação de nova candidatura."""
    pass


class ApplicationUpdate(BaseModel):
    """Schema para atualização de candidatura (todos os campos opcionais)."""
    nome: Optional[str] = Field(None, min_length=1)
    empresa: Optional[str] = Field(None, min_length=1)
    data: Optional[str] = None
    role: Optional[str] = Field(None, min_length=1)
    status: Optional[StatusEnum] = None
    chance: Optional[int] = Field(None, ge=0, le=100)

    @validator('data')
    def validate_data(cls, v):
        """Valida formato da data se fornecida."""
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Data deve estar no formato YYYY-MM-DD (ex: 2024-01-15)')
        return v


class ApplicationResponse(ApplicationBase):
    """Schema de resposta com dados completos da candidatura."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True