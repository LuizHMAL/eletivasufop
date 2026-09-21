from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from src.components.materias_component import (
    get_materias,
    get_materia,
    calcular_disponibilidade
)
from src.model.materias import (
    MateriasResponse,
    MateriaSimpleSelectResponse,
    DisponiveisRequest,
    DisponiveisResponse
)

router = APIRouter()


@router.get("/materias", response_model=MateriasResponse)
def listar_todas_materias():
    materias_dict = get_materias("todas")
    return MateriasResponse(materias=list(materias_dict.values()))


@router.get("/materias/{tipo}", response_model=MateriasResponse)
def listar_materias(tipo: str = "todas"):
    if tipo not in ["todas", "obrigatorias", "eletivas"]:
        raise HTTPException(status_code=400, detail="Tipo inválido. Use 'todas', 'obrigatorias' ou 'eletivas'.")

    materias_dict = get_materias(tipo)
    return MateriasResponse(materias=list(materias_dict.values()))


@router.get("/materia/{codigo}", response_model=MateriaSimpleSelectResponse)
def obter_materia(codigo: str):
    materia = get_materia(codigo)

    if not materia:
        raise HTTPException(status_code=404, detail="Matéria não encontrada.")

    return MateriaSimpleSelectResponse(
        codigo=materia.codigo,
        nome=materia.nome,
        obrigatoria=materia.obrigatoria,
        prerequisitos=materia.prerequisitos,
        periodo=materia.periodo,
    )


@router.post("/materias/disponiveis", response_model=DisponiveisResponse)
def calcular_materias_disponiveis(payload: DisponiveisRequest):
    return calcular_disponibilidade(
        cursadas_input=payload.cursadas,
        auto_incluir_prerequisitos=payload.auto_incluir_prerequisitos
    )


@router.get("/materias/disponiveis/calc", response_model=DisponiveisResponse)
def calcular_materias_disponiveis_get(
    cursadas: Optional[str] = Query(default="", description="Códigos separados por vírgula"),
    auto_incluir: bool = True
):
    lista_cursadas = [c.strip().upper() for c in cursadas.split(",") if c.strip()]
    return calcular_disponibilidade(
        cursadas_input=lista_cursadas,
        auto_incluir_prerequisitos=auto_incluir
    )
