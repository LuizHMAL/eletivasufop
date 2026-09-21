# Eletivas UFOP - Monorepo

Sistema de gerenciamento e visualização de disciplinas obrigatórias e eletivas do curso de Engenharia de Computação / Ciência da Computação — UFOP.

## Estrutura do Projeto

```text
eletivasufop/
├── frontend/             # Frontend em React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── components/   # MateriasTable, estilos, etc.
│   │   ├── App.tsx       # Layout principal
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── eletivasbknd/         # Backend em FastAPI (Python 3.13 + uv)
│   ├── src/
│   │   ├── components/   # Lógica de matérias e pré-requisitos
│   │   ├── data/         # Base de matérias (materias.json)
│   │   ├── model/        # Schemas Pydantic
│   │   ├── routes/       # Rotas REST da API
│   │   └── main.py       # Ponto de entrada FastAPI com CORS
│   └── pyproject.toml
│
├── package.json          # Orquestrador unificado (scripts simultâneos)
└── README.md
```

## Pré-requisitos

- **Node.js** (v18+)
- **uv** (gerenciador de pacotes Python)

## Instalação

```bash
# Instala dependências do monorepo e do frontend
npm install

# Instala/sincroniza o backend Python
npm run install:all
```

## Como Executar

### 1. Iniciar Frontend e Backend Juntos (Recomendado)

```bash
npm run dev
```

- **Frontend (React + Vite)**: [http://localhost:5173](http://localhost:5173)
- **Backend (FastAPI)**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Documentação Swagger da API**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Iniciar Serviços Individualmente

```bash
# Apenas o Backend:
npm run dev:backend

# Apenas o Frontend:
npm run dev:frontend
```

### 3. Build do Frontend

```bash
npm run build
```
