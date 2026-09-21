import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.components.materias_component import (
    get_materias,
    expandir_prerequisitos,
    calcular_disponibilidade
)

client = TestClient(app)


def test_todas_materias_carregadas():
    materias = get_materias("todas")
    assert len(materias) == 109
    obrig = [m for m in materias.values() if m.obrigatoria]
    elet = [m for m in materias.values() if not m.obrigatoria]
    assert len(obrig) == 49
    assert len(elet) == 60


def test_periodos_obrigatorias():
    materias = get_materias("obrigatorias")
    for m in materias.values():
        assert m.periodo is not None
        assert 1 <= m.periodo <= 10


def test_expandir_prerequisitos_recursivo():
    # CEA052 (Cálculo III) depende de CEA051 (Cálculo II) que depende de CEA050 (Cálculo I)
    expanded = expandir_prerequisitos({"CEA052"})
    assert "CEA052" in expanded
    assert "CEA051" in expanded
    assert "CEA050" in expanded


def test_calcular_disponibilidade_sem_cursadas():
    res = calcular_disponibilidade([], auto_incluir_prerequisitos=True)
    assert res.total_cursadas == 0
    # Todas as do 1º período (e eletivas sem pré-req) devem estar disponíveis
    disponiveis_codigos = {m.codigo for m in res.obrigatorias_disponiveis}
    assert "CEA050" in disponiveis_codigos  # Cálculo 1
    assert "CSI101" in disponiveis_codigos  # Prog 1
    # Cálculo 2 e Prog 2 devem estar bloqueadas
    bloqueadas_codigos = {m.codigo for m in res.obrigatorias_bloqueadas}
    assert "CEA051" in bloqueadas_codigos
    assert "CSI102" in bloqueadas_codigos


def test_calcular_disponibilidade_com_prerequisito():
    # Cursando Cálculo I deve liberar Cálculo II e Estatística
    res = calcular_disponibilidade(["CEA050"], auto_incluir_prerequisitos=True)
    disponiveis_codigos = {m.codigo for m in res.obrigatorias_disponiveis}
    assert "CEA051" in disponiveis_codigos  # Cálculo II
    assert "CEA055" in disponiveis_codigos  # Estatística


def test_api_disponiveis_endpoint():
    response = client.post(
        "/materias/disponiveis",
        json={"cursadas": ["CEA052"], "auto_incluir_prerequisitos": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert "CEA050" in data["cursadas"]
    assert "CEA051" in data["cursadas"]
    assert "CEA052" in data["cursadas"]
    assert data["total_cursadas"] >= 3