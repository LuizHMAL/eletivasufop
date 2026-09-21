import json
from pathlib import Path
from typing import Dict, List, Optional, Set
try:
    from model.materias import (
        Materia,
        MateriaStatus,
        DisponiveisResponse
    )
except ImportError:
    from api.model.materias import (
        Materia,
        MateriaStatus,
        DisponiveisResponse
    )

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "materias.json"

_cache: Dict[str, Dict[str, Materia]] = {}


def _load_raw_data() -> dict:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_materias(tipo: str = "todas") -> Dict[str, Materia]:
    if tipo in _cache:
        return _cache[tipo]

    raw = _load_raw_data()
    materias: Dict[str, Materia] = {}

    for codigo, m in raw["disciplinas"].items():
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

    _cache[tipo] = materias
    return materias


def get_materia(codigo: str) -> Optional[Materia]:
    todas = get_materias("todas")
    return todas.get(codigo)


def expandir_prerequisitos(codigos: Set[str]) -> Set[str]:
    todas = get_materias("todas")
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
    auto_incluir_prerequisitos: bool = True
) -> DisponiveisResponse:
    todas = get_materias("todas")

    # Filtra apenas códigos válidos
    codigos_validos = {c for c in cursadas_input if c in todas}

    # Expande dependências se requisitado
    if auto_incluir_prerequisitos:
        cursadas_set = expandir_prerequisitos(codigos_validos)
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
    )