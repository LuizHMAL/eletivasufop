from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from src.routes.materia_route import router as materias_router
except ImportError:
    from eletivasbknd.src.routes.materia_route import router as materias_router


# Desabilita completamente a documentação Swagger e Redoc do FastAPI
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(materias_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "API Eletivas UFOP"}