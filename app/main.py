from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, HTMLResponse

from app.routers import applications, auth_router

app = FastAPI(title="Job Finder Tracker API")

# ✅ CORS (ajuste conforme seus domínios)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://job-finder-tracker-production.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Rotas de API (SEM /app)
app.include_router(auth_router.router)
app.include_router(applications.router)

# ✅ Static em /static (global)
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")


# ✅ Raiz redireciona pro frontend
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/app")


# ✅ Frontend servido em /app
@app.get("/app", response_class=HTMLResponse, include_in_schema=False)
def serve_frontend():
    with open("frontend/index.html", "r", encoding="utf-8") as f:
        return f.read()


# ✅ Healthcheck opcional
@app.get("/api", tags=["health"])
def api_health():
    return {"status": "online"}
