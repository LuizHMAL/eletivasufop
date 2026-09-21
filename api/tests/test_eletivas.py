import pytest
from fastapi.testclient import TestClient
try:
    from index import app
    from components.materias_component import (
        get_materias,
        expandir_prerequisitos,
        calcular_disponibilidade,
        listar_grades
    )
except ImportError:
    from api.index import app
    from api.components.materias_component import (
        get_materias,
        expandir_prerequisitos,
        calcular_disponibilidade,
        listar_grades
    )

client = TestClient(app)


def test_grades_endpoint():
    response = client.get("/grades")
    assert response.status_code == 200
    data = response.json()
    assert len(data["grades"]) == 2
    ids = [g["id"] for g in data["grades"]]
    assert "2023_2" in ids
    assert "2024_1" in ids


def test_grade_2023_2_carregamento():
    materias = get_materias("todas", grade="2023_2")
    assert len(materias) == 108
    obrig = [m for m in materias.values() if m.obrigatoria]
    elet = [m for m in materias.values() if not m.obrigatoria]
    assert len(obrig) == 52
    assert len(elet) == 56

    # Na grade 2023/2, Programação 1 é CSI030 e AEDs 1 é CSI488
    assert "CSI030" in materias
    assert "CSI488" in materias
    assert materias["CSI030"].obrigatoria
    assert materias["CSI030"].periodo == 1


def test_grade_2024_1_carregamento():
    materias = get_materias("todas", grade="2024_1")
    assert len(materias) == 130
    obrig = [m for m in materias.values() if m.obrigatoria]
    elet = [m for m in materias.values() if not m.obrigatoria]
    assert len(obrig) == 51
    assert len(elet) == 79

    # Na grade 2024/1, Programação 1 é CSI101 e AEDs 1 é CSI103
    assert "CSI101" in materias
    assert "CSI103" in materias
    assert materias["CSI101"].obrigatoria
    assert materias["CSI101"].periodo == 1


def test_periodos_obrigatorias_ambas_grades():
    for g in ["2023_2", "2024_1"]:
        materias = get_materias("obrigatorias", grade=g)
        for m in materias.values():
            assert m.periodo is not None
            assert 1 <= m.periodo <= 10, f"{m.codigo} na grade {g} tem período inválido: {m.periodo}"


def test_expandir_prerequisitos_recursivo_ambas_grades():
    # Grade 2023/2: CEA052 -> CEA051 -> CEA049, CEA050
    expanded_23 = expandir_prerequisitos({"CEA052"}, grade="2023_2")
    assert "CEA052" in expanded_23
    assert "CEA051" in expanded_23
    assert "CEA050" in expanded_23

    # Grade 2024/1: CSI104 -> CSI102, CSI103 -> CSI101
    expanded_24 = expandir_prerequisitos({"CSI104"}, grade="2024_1")
    assert "CSI104" in expanded_24
    assert "CSI102" in expanded_24
    assert "CSI103" in expanded_24
    assert "CSI101" in expanded_24


def test_api_disponiveis_endpoint_com_grade():
    # Teste com grade 2023/2
    res_23 = client.post(
        "/materias/disponiveis",
        json={"cursadas": ["CEA052"], "grade": "2023_2", "auto_incluir_prerequisitos": True}
    )
    assert res_23.status_code == 200
    data_23 = res_23.json()
    assert data_23["grade"] == "2023_2"
    assert "CEA050" in data_23["cursadas"]

    # Teste com grade 2024/1
    res_24 = client.post(
        "/materias/disponiveis",
        json={"cursadas": ["CSI104"], "grade": "2024_1", "auto_incluir_prerequisitos": True}
    )
    assert res_24.status_code == 200
    data_24 = res_24.json()
    assert data_24["grade"] == "2024_1"
    assert "CSI101" in data_24["cursadas"]