from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from .models import StatusEnum


# ========== USER SCHEMAS ==========

class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Senha deve ter no mínimo 6 caracteres")


class UserLogin(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========== TOKEN SCHEMAS ==========

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# ========== APPLICATION SCHEMAS ==========

class ApplicationBase(BaseModel):
    nome: str = Field(..., min_length=1, description="Nome da vaga")
    empresa: str = Field(..., min_length=1, description="Nome da empresa")
    data: str = Field(..., description="Data da candidatura (ex: 2024-01-15)")
    role: str = Field(..., min_length=1, description="Cargo/função")
    status: StatusEnum = Field(default=StatusEnum.ESPERANDO)
    chance: int = Field(default=50, ge=0, le=100, description="Chance de sucesso (0-100)")

    @validator('data')
    def validate_data(cls, v):
        """Valida formato da data"""
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Data deve estar no formato YYYY-MM-DD (ex: 2024-01-15)')


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1)
    empresa: Optional[str] = Field(None, min_length=1)
    data: Optional[str] = None
    role: Optional[str] = Field(None, min_length=1)
    status: Optional[StatusEnum] = None
    chance: Optional[int] = Field(None, ge=0, le=100)

    @validator('data')
    def validate_data(cls, v):
        """Valida formato da data"""
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Data deve estar no formato YYYY-MM-DD (ex: 2024-01-15)')
        return v


class ApplicationResponse(ApplicationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True