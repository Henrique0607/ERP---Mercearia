# ERP Mercearia - Sabor & Cia

## Visao geral
Sistema ERP para uma mercearia pequena, com modulos de Dashboard, Produtos, Compras, Vendas/PDV, Estoque, Fornecedores, Clientes, Financeiro, Contabilidade e Auditoria.

- Backend: FastAPI + PostgreSQL async
- Frontend: React + Tailwind + Shadcn UI
- Banco de dados: PostgreSQL

## Estrutura do projeto
```text
ERP - Mercearia/
|-- app/
|   |-- backend/      # API FastAPI, models, rotas e schemas
|   `-- frontend/     # Aplicacao React
|-- start-dev.bat     # Inicializacao rapida no Windows
|-- start-dev.ps1     # Script usado pelo .bat
|-- INICIAR.md        # Guia curto de inicializacao
`-- README.md
```

## Pre-requisitos
Antes de iniciar, tenha instalado:

- PostgreSQL 13+ rodando em `localhost:5432`
- Python 3.10+
- Node.js 18+
- npm
- Git, opcional para versionamento

O projeto usa as seguintes credenciais de banco no arquivo `app/backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:1234@127.0.0.1:5432/ERP_Mercearia
```

## Configurar o banco de dados
Crie o banco `ERP_Mercearia` no PostgreSQL.

Pelo terminal:
```bash
createdb ERP_Mercearia -U postgres -h localhost
```

Ou pelo pgAdmin/DBeaver:

- Database: `ERP_Mercearia`
- Usuario: `postgres`
- Senha: `1234`
- Host: `localhost`
- Porta: `5432`

As tabelas sao criadas automaticamente quando o backend inicia.

## Inicializacao rapida no Windows
Na raiz ..\ERP - Mercearia do projeto, execute:

```bat
.\start-dev.bat
```

Esse arquivo abre duas janelas do PowerShell:

- Backend FastAPI em `http://localhost:8000`
- Frontend React em `http://localhost:3000`

A documentacao da API fica em:

```text
http://localhost:8000/docs
```

Para parar o projeto, feche as duas janelas do PowerShell abertas pelo script.

## O que o script faz
O `start-dev.bat` chama o `start-dev.ps1`, que:

1. Verifica se existe o ambiente virtual do backend em `app/backend/.venv`.
2. Cria o ambiente virtual se ele nao existir.
3. Verifica se as dependencias principais do backend estao instaladas.
4. Executa `pip install -r requirements.txt` se faltar alguma dependencia.
5. Verifica se existe `app/frontend/node_modules`.
6. Executa `npm install` se as dependencias do frontend nao estiverem instaladas.
7. Inicia backend e frontend em janelas separadas.

## Instalacao manual
Use estes comandos apenas se quiser configurar ou depurar manualmente.

### Backend
```bash
cd app/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

API:
```text
http://localhost:8000
```

Docs:
```text
http://localhost:8000/docs
```

### Frontend
```bash
cd app/frontend
npm install
npm start
```

Aplicacao:
```text
http://localhost:3000
```

## Popular o banco com dados de teste
Com o backend configurado, rode:

```bash
cd app/backend
.venv\Scripts\activate
python seed.py
```

## Comandos uteis
```bash
# Rodar backend manualmente
cd app/backend
.venv\Scripts\activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Rodar frontend manualmente
cd app/frontend
npm start

# Build do frontend
cd app/frontend
npm run build
```

## Problemas comuns
- Erro de conexao com banco: verifique se o PostgreSQL esta rodando e se o banco `ERP_Mercearia` existe.
- Senha diferente do PostgreSQL: atualize `app/backend/.env` com a senha correta.
- Porta 3000 ocupada: o React pode sugerir outra porta, como `3001`.
- Porta 8000 ocupada: feche outro backend em execucao ou altere a porta no comando do `start-dev.ps1`.
- Erro de permissao no PowerShell: execute o `start-dev.bat`, pois ele ja chama o PowerShell com `ExecutionPolicy Bypass` para este script.

## Modulos disponiveis
- Dashboard
- Produtos
- Compras
- Vendas/PDV
- Estoque
- Fornecedores
- Clientes
- Financeiro
- Contabilidade
- Auditoria

## Stack tecnica
- Backend: FastAPI, SQLAlchemy async, asyncpg, Alembic
- Frontend: React 18, React Router, Tailwind CSS, Shadcn UI, Recharts, Lucide icons
- Banco: PostgreSQL
