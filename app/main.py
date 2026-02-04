"""
Aplicação principal FastAPI para o Job Application Tracker.
Sistema para gerenciamento de candidaturas de emprego com autenticação JWT e Google OAuth.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from .database import engine, Base
from .routers import auth_router, applications, users

from .routers import auth_router, applications, users, google_auth, config

# Cria todas as tabelas do banco de dados na inicialização
print("🔄 Criando tabelas no banco de dados...")
Base.metadata.create_all(bind=engine)
print("✅ Tabelas criadas com sucesso!")

# Inicializa a aplicação FastAPI
app = FastAPI(
    title="Job Application Tracker API",
    description="API para gerenciar candidaturas de emprego com autenticação JWT",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Monta diretório de arquivos estáticos (CSS, JS, imagens)
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# Configuração de CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://*.onrender.com",
        "https://*.railway.app",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Registra os routers da aplicação
app.include_router(auth_router.router)
app.include_router(applications.router)
app.include_router(users.router)
app.include_router(google_auth.router)
app.include_router(config.router)

@app.get("/", tags=["Root"])
def root():
    """Redireciona a rota raiz para a aplicação web."""
    return RedirectResponse(url="/app")


@app.get("/api", tags=["Root"])
def api_info():
    """Retorna informações básicas sobre a API e seus endpoints."""
    return {
        "message": "Job Application Tracker API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "app": "/app",
        "status": "online",
        "colors": {
            "bg_primary": "#0a0e14",
            "bg_secondary": "#0f1419",
            "bg_card": "#151b23",
            "accent_primary": "#00ff9f",
            "text_primary": "#e6edf3",
            "text_secondary": "#8b949e"
        }
    }


@app.get("/app", tags=["Frontend"])
def serve_frontend():
    """Serve a interface web (SPA) do Job Tracker."""
    return FileResponse("frontend/index.html")


@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint de health check para verificar status da API e banco de dados."""
    return {"status": "healthy", "database": "connected"}