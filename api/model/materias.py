from enum import Enum
from typing import Optional, List
from pydantic import BaseModel


class Materia(BaseModel):
    nome: str
    codigo: str
    prerequisitos: list[str] = []
    obrigatoria: bool
    periodo: Optional[int] = None

    def __repr__(self):
        return f"{self.codigo} - {self.nome}"


class TipoMateria(str, Enum):
    TODAS = "todas"
    OBRIGATORIAS = "obrigatorias"
    ELETIVAS = "eletivas"


class MateriasResponse(BaseModel):
    materias: list[Materia]


class MateriaSimpleSelectResponse(BaseModel):
    codigo: str
    nome: str
    obrigatoria: Optional[bool] = None
    prerequisitos: Optional[list[str]] = None
    periodo: Optional[int] = None


class MateriaStatus(BaseModel):
    codigo: str
    nome: str
    obrigatoria: bool
    prerequisitos: list[str] = []
    periodo: Optional[int] = None
    status: str  # "cursada" | "disponivel" | "bloqueada"
    prerequisitos_cumpridos: list[str] = []
    prerequisitos_faltantes: list[str] = []


class DisponiveisRequest(BaseModel):
    cursadas: list[str] = []
    auto_incluir_prerequisitos: bool = True
    grade: Optional[str] = "2024_1"


class DisponiveisResponse(BaseModel):
    cursadas: list[str]
    obrigatorias_disponiveis: list[MateriaStatus]
    eletivas_disponiveis: list[MateriaStatus]
    obrigatorias_bloqueadas: list[MateriaStatus]
    eletivas_bloqueadas: list[MateriaStatus]
    todas_materias: list[MateriaStatus]
    total_cursadas: int
    total_obrigatorias_disponiveis: int
    total_eletivas_disponiveis: int
    grade: Optional[str] = "2024_1"


class GradeInfo(BaseModel):
    id: str
    nome: str
    subtitulo: str
    total_materias: int
    total_obrigatorias: int
    total_eletivas: int


class GradesResponse(BaseModel):
    grades: list[GradeInfo]
    grade_padrao: str = "2024_1"
