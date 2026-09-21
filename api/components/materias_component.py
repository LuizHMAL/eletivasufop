import json
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

try:
    from model.materias import (
        Materia,
        MateriaStatus,
        DisponiveisResponse,
        GradeInfo,
        GradesResponse,
    )
except ImportError:
    from api.model.materias import (
        Materia,
        MateriaStatus,
        DisponiveisResponse,
        GradeInfo,
        GradesResponse,
    )

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

GRADES_CONFIG = {
    "2023_2": {
        "file": "grade_2023_2.json",
        "nome": "Até 2023/2 (Currículo 1)",
        "subtitulo": "Currículo Tradicional (52 Obrigatórias, 56 Eletivas)",
    },
    "2024_1": {
        "file": "grade_2024_1.json",
        "nome": "A partir de 2024/1 (Currículo 2)",
        "subtitulo": "Novo Currículo (51 Obrigatórias, 79 Eletivas)",
    },
}

_cache: Dict[Tuple[str, str], Dict[str, Materia]] = {}


def _normalize_grade_id(grade: Optional[str]) -> str:
    if not grade:
        return "2024_1"
    g = grade.strip().lower().replace("/", "_").replace("-", "_")
    if "2023" in g or "23" in g or "curriculo_1" in g or g == "1":
        return "2023_2"
    return "2024_1"


def _load_raw_data(grade: str = "2024_1") -> dict:
    grade_id = _normalize_grade_id(grade)
    cfg = GRADES_CONFIG.get(grade_id, GRADES_CONFIG["2024_1"])
    file_path = DATA_DIR / cfg["file"]
    if not file_path.exists():
        file_path = DATA_DIR / "materias.json"
    with open(file_path, encoding="utf-8") as f:
        return json.load(f)


def get_materias(tipo: str = "todas", grade: str = "2024_1") -> Dict[str, Materia]:
    grade_id = _normalize_grade_id(grade)
    cache_key = (grade_id, tipo)
    if cache_key in _cache:
        return _cache[cache_key]

    raw = _load_raw_data(grade_id)
    materias: Dict[str, Materia] = {}

    for codigo, m in raw.get("disciplinas", {}).items():
        if tipo == "obrigatorias" and not m.get("obrigatoria"):
            continue
        elif tipo == "eletivas" and m.get("obrigatoria"):
            continue

        materias[codigo] = Materia(
            nome=m["nome"],
            codigo=codigo,
            prerequisitos=m.get("prerequisitos", []),
            obrigatoria=m.get("obrigatoria", False),
            periodo=m.get("periodo")
        )

    _cache[cache_key] = materias
    return materias


def get_materia(codigo: str, grade: str = "2024_1") -> Optional[Materia]:
    todas = get_materias("todas", grade)
    return todas.get(codigo.upper())


def listar_grades() -> GradesResponse:
    lista: List[GradeInfo] = []
    for gid, cfg in GRADES_CONFIG.items():
        materias = get_materias("todas", gid)
        obrig = sum(1 for m in materias.values() if m.obrigatoria)
        elet = sum(1 for m in materias.values() if not m.obrigatoria)
        lista.append(GradeInfo(
            id=gid,
            nome=cfg["nome"],
            subtitulo=cfg["subtitulo"],
            total_materias=len(materias),
            total_obrigatorias=obrig,
            total_eletivas=elet,
        ))
    return GradesResponse(grades=lista, grade_padrao="2024_1")


def expandir_prerequisitos(codigos: Set[str], grade: str = "2024_1") -> Set[str]:
    grade_id = _normalize_grade_id(grade)
    todas = get_materias("todas", grade_id)
    resultado: Set[str] = set()

    def _visitar(cod: str):
        if cod in resultado:
            return
        materia = todas.get(cod)
        if not materia:
            return
        resultado.add(cod)
        for pr in materia.prerequisitos:
            _visitar(pr)

    for c in codigos:
        _visitar(c)

    return resultado


def verificar_prerequisitos(materias_cursadas: Set[str], materia: Materia) -> bool:
    return all(pr in materias_cursadas for pr in materia.prerequisitos)


def calcular_disponibilidade(
    cursadas_input: List[str],
    grade: str = "2024_1",
    auto_incluir_prerequisitos: bool = True
) -> DisponiveisResponse:
    grade_id = _normalize_grade_id(grade)
    todas = get_materias("todas", grade_id)

    # Filtra apenas códigos válidos da grade selecionada
    codigos_validos = {c.upper() for c in cursadas_input if c.upper() in todas}

    # Expande dependências se requisitado
    if auto_incluir_prerequisitos:
        cursadas_set = expandir_prerequisitos(codigos_validos, grade_id)
    else:
        cursadas_set = set(codigos_validos)

    obrigatorias_disponiveis: List[MateriaStatus] = []
    eletivas_disponiveis: List[MateriaStatus] = []
    obrigatorias_bloqueadas: List[MateriaStatus] = []
    eletivas_bloqueadas: List[MateriaStatus] = []
    todas_materias: List[MateriaStatus] = []

    # Ordenar matérias por período e código
    lista_materias = list(todas.values())
    lista_materias.sort(key=lambda m: (m.periodo if m.periodo is not None else 99, m.codigo))

    for m in lista_materias:
        prereqs = m.prerequisitos or []
        cumpridos = [pr for pr in prereqs if pr in cursadas_set]
        faltantes = [pr for pr in prereqs if pr not in cursadas_set]

        if m.codigo in cursadas_set:
            status = "cursada"
        elif len(faltantes) == 0:
            status = "disponivel"
        else:
            status = "bloqueada"

        item = MateriaStatus(
            codigo=m.codigo,
            nome=m.nome,
            obrigatoria=m.obrigatoria,
            prerequisitos=prereqs,
            periodo=m.periodo,
            status=status,
            prerequisitos_cumpridos=cumpridos,
            prerequisitos_faltantes=faltantes,
        )

        todas_materias.append(item)

        if status == "disponivel":
            if m.obrigatoria:
                obrigatorias_disponiveis.append(item)
            else:
                eletivas_disponiveis.append(item)
        elif status == "bloqueada":
            if m.obrigatoria:
                obrigatorias_bloqueadas.append(item)
            else:
                eletivas_bloqueadas.append(item)

    # Ordenar cursadas pelo período e código
    cursadas_ordenadas = sorted(
        list(cursadas_set),
        key=lambda c: (todas[c].periodo if todas.get(c) and todas[c].periodo is not None else 99, c)
    )

    return DisponiveisResponse(
        cursadas=cursadas_ordenadas,
        obrigatorias_disponiveis=obrigatorias_disponiveis,
        eletivas_disponiveis=eletivas_disponiveis,
        obrigatorias_bloqueadas=obrigatorias_bloqueadas,
        eletivas_bloqueadas=eletivas_bloqueadas,
        todas_materias=todas_materias,
        total_cursadas=len(cursadas_set),
        total_obrigatorias_disponiveis=len(obrigatorias_disponiveis),
        total_eletivas_disponiveis=len(eletivas_disponiveis),
        grade=grade_id,
    )