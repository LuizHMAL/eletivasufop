import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
BACKEND_DIR = ROOT_DIR / "eletivasbknd"

for p in [str(ROOT_DIR), str(BACKEND_DIR), str(BACKEND_DIR / "src")]:
    if p not in sys.path:
        sys.path.insert(0, p)

from src.routes.materia_route import router as materias_router

# Instância explícita de FastAPI no nível superior do módulo (exigência do Vercel CLI)
# Desabilita docs_url, redoc_url e openapi_url conforme requisitado
app = FastAPI(
    title="Eletivas UFOP API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# Middleware para normalizar rewrites internos caso o Vercel encaminhe com o destino /api/index.py
@app.middleware("http")
async def normalize_rewrite_path(request, call_next):
    path = request.scope.get("path", "")
    if path.startswith("/api/index.py"):
        new_path = path[len("/api/index.py"):]
        request.scope["path"] = new_path if new_path else "/"
    elif path.startswith("/api/index"):
        new_path = path[len("/api/index"):]
        request.scope["path"] = new_path if new_path else "/"
    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monta as rotas em / e também em /api para compatibilidade total
app.include_router(materias_router)
app.include_router(materias_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "API Eletivas UFOP"}


@app.get("/api")
def api_root():
    return {"message": "API Eletivas UFOP"}
