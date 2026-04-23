# ERP Mercearia - Sabor & Cia

## 📋 Visão Geral
Sistema ERP completo para mercearia pequena, com módulos de Dashboard, Produtos, Compras, Vendas (PDV), Estoque, Fornecedores, Clientes, Financeiro, Contabilidade e Auditoria.  
**Backend**: FastAPI + PostgreSQL (async).  
**Frontend**: React + Tailwind + Shadcn UI.

```
ERP Mercearia/
├── app/
│   ├── backend/     # FastAPI server, models, routes
│   └── frontend/    # React app
├── .venv/           # Python virtual env
└── README.md
```

## 🛠️ Pré-requisitos
- **PostgreSQL** 13+ rodando em `localhost:5432`
- **Python** 3.10+
- **Node.js** 18+ + **Yarn** 1.22+
- Git

## 🗄️ Configurar Banco de Dados
1. Crie o banco:
   ```bash
   createdb ERP_Mercearia -U postgres -h localhost
   ```
   Ou use pgAdmin/DBeaver: DB `ERP_Mercearia`, user `postgres`, senha `1234`.

2. Tables são criadas automaticamente no startup do backend.

## 🚀 Como Rodar (Development)

### Backend (API em http://localhost:8000)
```bash
cd app/backend
python -m venv .venv
.venv\\Scripts\\activate  # Windows
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```
- Docs: http://localhost:8000/docs
- DB seed opcional: `python seed.py`

### Frontend (App em http://localhost:3000)
```bash
cd app/frontend
npm install
npm start
```

## 📱 Módulos Disponíveis
- Dashboard
- Produtos
- Compras
- Vendas
- Estoque
- Fornecedores
- Clientes
- Financeiro
- Contabilidade
- Auditoria

## 🔧 Comandos Úteis
```bash
# Backend tests
cd app/backend && pytest

# Frontend build
cd app/frontend && yarn build

# Popular DB com dados de teste
cd app/backend && python seed.py
```

## 🐛 Problemas Comuns
- **DB connection**: Verifique PostgreSQL rodando e credenciais em `app/backend/database.py`.
- **CORS**: Frontend em 3000, backend em 8000 (CORS liberado).
- **Windows venv**: Use `.venv\\Scripts\\activate`.

## 📚 Tech Stack
- **Backend**: FastAPI, SQLAlchemy (async), asyncpg, Alembic
- **Frontend**: React 18, React Router, Tailwind CSS, Shadcn UI, Recharts, Lucide icons
- **Banco**: PostgreSQL
- **Design**: Tema "Organic & Earthy" (Emerald/Amber)

Feito com ❤️ para Uniube SIG!

