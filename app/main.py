from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from .database import engine, Base
from .routers import auth_router, applications, users  # ← ADICIONADO users

# ========== CRIAR TABELAS NO BANCO ==========
# IMPORTANTE: Isso cria as tabelas automaticamente ao iniciar
print("🔄 Criando tabelas no banco de dados...")
Base.metadata.create_all(bind=engine)
print("✅ Tabelas criadas com sucesso!")

# Criar app FastAPI
app = FastAPI(
    title="Job Application Tracker API",
    description="API para gerenciar candidaturas de emprego com autenticação JWT",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Servir arquivos estáticos
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# Configurar CORS
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
)

# Incluir routers
app.include_router(auth_router.router)
app.include_router(applications.router)
app.include_router(users.router)  # ← ADICIONADO users router


@app.get("/", tags=["Root"])
def root():
    """
    Redirect para o frontend
    
    Redireciona automaticamente para a interface web
    """
    return RedirectResponse(url="/app")


@app.get("/api", tags=["Root"])
def api_info():
    """
    Informações da API
    
    Retorna informações básicas sobre a API
    """
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
    """
    Servir a interface web do Job Tracker
    
    Acesse em: http://localhost:8000/app
    """
    return FileResponse("frontend/index.html")


@app.get("/health", tags=["Health"])
def health_check():
    """
    Health check endpoint
    
    Verifica se a API está funcionando
    """
    return {"status": "healthy", "database": "connected"}