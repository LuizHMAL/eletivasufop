from fastapi import APIRouter, HTTPException, Query
from typing import Optional
try:
    from components.materias_component import (
        get_materias,
        get_materia,
        calcular_disponibilidade,
        listar_grades
    )
    from model.materias import (
        MateriasResponse,
        MateriaSimpleSelectResponse,
        DisponiveisRequest,
        DisponiveisResponse,
        GradesResponse
    )
except ImportError:
    from api.components.materias_component import (
        get_materias,
        get_materia,
        calcular_disponibilidade,
        listar_grades
    )
    from api.model.materias import (
        MateriasResponse,
        MateriaSimpleSelectResponse,
        DisponiveisRequest,
        DisponiveisResponse,
        GradesResponse
    )

router = APIRouter()


@router.get("/grades", response_model=GradesResponse)
def obter_grades_disponiveis():
    return listar_grades()


@router.get("/materias", response_model=MateriasResponse)
def listar_todas_materias(grade: Optional[str] = Query(default="2024_1", description="Grade curricular (2023_2 ou 2024_1)")):
    materias_dict = get_materias("todas", grade=grade)
    return MateriasResponse(materias=list(materias_dict.values()))


@router.get("/materias/{tipo}", response_model=MateriasResponse)
def listar_materias(
    tipo: str = "todas",
    grade: Optional[str] = Query(default="2024_1", description="Grade curricular (2023_2 ou 2024_1)")
):
    if tipo not in ["todas", "obrigatorias", "eletivas"]:
        raise HTTPException(status_code=400, detail="Tipo inválido. Use 'todas', 'obrigatorias' ou 'eletivas'.")

    materias_dict = get_materias(tipo, grade=grade)
    return MateriasResponse(materias=list(materias_dict.values()))


@router.get("/materia/{codigo}", response_model=MateriaSimpleSelectResponse)
def obter_materia(
    codigo: str,
    grade: Optional[str] = Query(default="2024_1", description="Grade curricular (2023_2 ou 2024_1)")
):
    materia = get_materia(codigo, grade=grade)

    if not materia:
        raise HTTPException(status_code=404, detail="Matéria não encontrada nesta grade.")

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
        grade=payload.grade or "2024_1",
        auto_incluir_prerequisitos=payload.auto_incluir_prerequisitos
    )


@router.get("/materias/disponiveis/calc", response_model=DisponiveisResponse)
def calcular_materias_disponiveis_get(
    cursadas: Optional[str] = Query(default="", description="Códigos separados por vírgula"),
    grade: Optional[str] = Query(default="2024_1", description="Grade curricular (2023_2 ou 2024_1)"),
    auto_incluir: bool = True
):
    lista_cursadas = [c.strip().upper() for c in cursadas.split(",") if c.strip()]
    return calcular_disponibilidade(
        cursadas_input=lista_cursadas,
        grade=grade,
        auto_incluir_prerequisitos=auto_incluir
    )
