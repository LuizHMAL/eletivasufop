from fastapi import FastAPI
from src.routes.materia_route import router as materias_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
app.include_router(materias_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root():
    return {"message": "Bem-vindo à API de Eletivas!"}