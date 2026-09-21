#Escreve todas as matérias
uv run python -m src.components.materias_component


#Código protótipo
uv run python -m src.tests.test_eletivas

#Rodar a API
uv run uvicorn src.main:app --reload   


#FastAPI para testes
http://localhost:8000/docs#