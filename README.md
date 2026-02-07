# Job Application Tracker

Aplicacao web fullstack para gerenciar candidaturas de emprego, entrevistas e acompanhar o progresso.

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-00ff9f?style=flat-square&logo=fastapi)
![Firebase](https://img.shields.io/badge/Firebase-Auth-orange?style=flat-square&logo=firebase)
![Railway](https://img.shields.io/badge/Deploy-Railway-purple?style=flat-square&logo=railway)

## Tech Stack

**Backend:** Python, FastAPI, SQLAlchemy, Pydantic, JWT, Bcrypt, Firebase Admin SDK

**Frontend:** HTML, CSS, JavaScript (Vanilla)

**Auth:** JWT + Google OAuth (Firebase)

**Database:** SQLite (dev) / PostgreSQL (prod)

**Deploy:** Railway

## Features

- Autenticacao JWT + Google OAuth
- CRUD de candidaturas com status tracking
- Historico de entrevistas completo
- Sistema de notificacoes/lembretes
- Dashboard com estatisticas
- Tema claro/escuro
- Multi-usuario com isolamento de dados

## Rodando localmente

```bash
git clone https://github.com/Tumiat1nho/job-finder-tracker.git
cd job-finder-tracker
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Acesse `http://localhost:8000`

## Variaveis de ambiente

```
SECRET_KEY=<gerar com: python -c "import secrets; print(secrets.token_hex(32))">
DATABASE_URL=sqlite:///./app.db
CORS_ORIGINS=http://localhost:8000
FIREBASE_SERVICE_ACCOUNT_KEY=<json da service account>
```

---

Desenvolvido por [Diogo Tumiati](https://github.com/Tumiat1nho)
