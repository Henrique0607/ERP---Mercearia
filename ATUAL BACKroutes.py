from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from database import get_db
from sqlalchemy import distinct
from models import FinancialEntry, Sale
from models import Product, Customer, Supplier, Sale, SaleItem, Purchase, PurchaseItem, StockMovement, FinancialEntry, Account, AuditLog, User
from schemas import (
    UserCreate, UserUpdate, User as UserSchema, LoginRequest, LoginResponse,
    ProductCreate, ProductUpdate, Product as ProductSchema,
    CustomerCreate, CustomerUpdate, Customer as CustomerSchema,
    SupplierCreate, SupplierUpdate, Supplier as SupplierSchema,
    SaleCreate, Sale as SaleSchema,
    PurchaseCreate, Purchase as PurchaseSchema,
    StockMovementCreate, StockMovement as StockMovementSchema,
    FinancialEntryCreate, FinancialEntryUpdate, FinancialEntry as FinancialEntrySchema,
    AccountCreate, AccountUpdate, Account as AccountSchema,
    AuditLog as AuditLogSchema,
    DashboardStats,
    PurchaseNeedReport,
    BalanceSheetReport,
    IncomeStatementReport,
    ProfitabilityReport
)
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import json
import httpx
import re
import os
from contextvars import ContextVar
from dotenv import load_dotenv
from passlib.hash import pbkdf2_sha256

load_dotenv()

router = APIRouter(prefix="/api")
current_user_id: ContextVar[int | None] = ContextVar("current_user_id", default=None)

async def get_current_user(db: AsyncSession = Depends(get_db)):
    user_id = current_user_id.get()
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuario nao autenticado")
    result = await db.execute(select(User).where(User.id == user_id, User.active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao autenticado")
    return user

def require_roles(*roles: str):
    async def dependency(user: User = Depends(get_current_user)):
        role = user.role.value if hasattr(user.role, "value") else str(user.role)
        if role not in roles:
            raise HTTPException(status_code=403, detail="Acesso negado para este perfil")
        return user
    return dependency

def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)

def verify_password(password: str, stored_password: str) -> bool:
    if not stored_password:
        return False
    if stored_password.startswith("$pbkdf2-sha256$"):
        return pbkdf2_sha256.verify(password, stored_password)
    return password == stored_password

def is_valid_cpf(cpf: str) -> bool:
    clean = re.sub(r"\D", "", cpf or "")
    if len(clean) != 11 or len(set(clean)) == 1:
        return False
    total = sum(int(clean[i]) * (10 - i) for i in range(9))
    digit = 0 if (total * 10) % 11 == 10 else (total * 10) % 11
    if digit != int(clean[9]):
        return False
    total = sum(int(clean[i]) * (11 - i) for i in range(10))
    digit = 0 if (total * 10) % 11 == 10 else (total * 10) % 11
    return digit == int(clean[10])

def is_valid_cnpj(cnpj: str) -> bool:
    clean = re.sub(r"\D", "", cnpj or "")
    if len(clean) != 14 or len(set(clean)) == 1:
        return False

    def calculate_digit(numbers: str, weights: list[int]) -> str:
        total = sum(int(number) * weight for number, weight in zip(numbers, weights))
        remainder = total % 11
        return "0" if remainder < 2 else str(11 - remainder)

    first_digit = calculate_digit(clean[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    second_digit = calculate_digit(clean[:12] + first_digit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return clean[-2:] == first_digit + second_digit

def validate_cpf_cnpj_document(value: str, allow_cpf: bool = True) -> str:
    clean = re.sub(r"\D", "", value or "")
    if len(clean) == 11 and allow_cpf and is_valid_cpf(clean):
        return clean
    if len(clean) == 14 and is_valid_cnpj(clean):
        return clean
    document_name = "CPF/CNPJ" if allow_cpf else "CNPJ"
    raise HTTPException(status_code=400, detail=f"{document_name} invalido")

# Credenciais da API Receita Federal (adicionar no .env)
RECEITA_FEDERAL_CLIENT_ID = os.getenv("RECEITA_FEDERAL_CLIENT_ID", "")
RECEITA_FEDERAL_CLIENT_SECRET = os.getenv("RECEITA_FEDERAL_CLIENT_SECRET", "")
RECEITA_FEDERAL_CPF_USUARIO = os.getenv("RECEITA_FEDERAL_CPF_USUARIO", "")
# URLs da API Receita Federal
RECEITA_FEDERAL_BASE_URL = "https://h-apigateway.conectagov.np.estaleiro.serpro.gov.br"  # Sandbox
RECEITA_FEDERAL_OAUTH_URL = f"{RECEITA_FEDERAL_BASE_URL}/oauth2/jwt-token"
RECEITA_FEDERAL_CNPJ_URL = f"{RECEITA_FEDERAL_BASE_URL}/api-cnpj-empresa/v2/empresa"

# Cache simples para token (em produção, usar Redis)
_token_cache = {"token": None, "expires_at": None}

async def get_receita_federal_token():
    """Obtém token JWT da API Receita Federal"""
    try:
        now = datetime.now(timezone.utc)
        if _token_cache["token"] and _token_cache["expires_at"] and now < _token_cache["expires_at"]:
            return _token_cache["token"]
        
        if not RECEITA_FEDERAL_CLIENT_ID or not RECEITA_FEDERAL_CLIENT_SECRET:
            raise HTTPException(
                status_code=500, 
                detail="Credenciais da Receita Federal não configuradas. Configure RECEITA_FEDERAL_CLIENT_ID e RECEITA_FEDERAL_CLIENT_SECRET no .env"
            )
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                RECEITA_FEDERAL_OAUTH_URL,
                json={
                    "client_id": RECEITA_FEDERAL_CLIENT_ID,
                    "client_secret": RECEITA_FEDERAL_CLIENT_SECRET
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                print(f"Erro ao obter token Receita Federal: {response.text}")
                raise HTTPException(status_code=500, detail="Erro ao obter token da Receita Federal")
            
            data = response.json()
            token = data.get("access_token")
            expires_in = int(data.get("expires_in", 3600)) - 60  # Renovar 1 min antes
            
            _token_cache["token"] = token
            _token_cache["expires_at"] = now + timedelta(seconds=expires_in)
            
            return token
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao obter token: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao autenticar com Receita Federal")

async def create_audit_log(db: AsyncSession, action: str, entity: str, entity_id: int, old_data=None, new_data=None):
    audit = AuditLog(
        user_id=current_user_id.get(),
        action=action,
        entity=entity,
        entity_id=entity_id,
        old_data=json.dumps(old_data) if old_data else None,
        new_data=json.dumps(new_data) if new_data else None
    )
    db.add(audit)

DEFAULT_ACCOUNTS = [
    ("1", "ATIVO", "ATIVO", None),
    ("1.1", "CIRCULANTE", "ATIVO", "1"),
    ("1.1.1", "Disponivel", "ATIVO", "1.1"),
    ("1.1.1.1", "Caixa", "ATIVO", "1.1.1"),
    ("1.1.1.2", "Bancos Conta Movimento", "ATIVO", "1.1.1"),
    ("1.1.1.2.1", "Banco A", "ATIVO", "1.1.1.2"),
    ("1.1.1.2.2", "Banco B", "ATIVO", "1.1.1.2"),
    ("1.1.2", "Aplicacoes Financeiras", "ATIVO", "1.1"),
    ("1.1.2.1", "Fundos de Investimento", "ATIVO", "1.1.2"),
    ("1.1.2.2", "CDB", "ATIVO", "1.1.2"),
    ("1.1.3", "Clientes", "ATIVO", "1.1"),
    ("1.1.3.1", "Duplicatas a Receber de Clientes", "ATIVO", "1.1.3"),
    ("1.1.3.1.1", "Cliente A", "ATIVO", "1.1.3.1"),
    ("1.1.3.1.2", "Cliente B", "ATIVO", "1.1.3.1"),
    ("1.1.3.2", "(-) Duplicatas Descontadas", "ATIVO", "1.1.3"),
    ("1.1.3.3", "(-) Provisao para Devedores Duvidosos", "ATIVO", "1.1.3"),
    ("1.1.4", "Outras Contas a Receber", "ATIVO", "1.1"),
    ("1.1.4.1", "Emprestimos a Receber", "ATIVO", "1.1.4"),
    ("1.1.4.2", "Adiantamento a Funcionarios", "ATIVO", "1.1.4"),
    ("1.1.4.3", "Impostos a Recuperar", "ATIVO", "1.1.4"),
    ("1.1.5", "Estoques", "ATIVO", "1.1"),
    ("1.1.5.1", "Produtos Acabados ou Mercadorias", "ATIVO", "1.1.5"),
    ("1.1.5.2", "Produtos em Elaboracao", "ATIVO", "1.1.5"),
    ("1.1.5.3", "Materias Primas", "ATIVO", "1.1.5"),
    ("1.1.5.4", "Material de Consumo", "ATIVO", "1.1.5"),
    ("1.1.5.5", "Material de Escritorio", "ATIVO", "1.1.5"),
    ("1.1.5.6", "(-) Provisao para Perda no Estoque", "ATIVO", "1.1.5"),
    ("1.1.6", "Despesas Antecipadas", "ATIVO", "1.1"),
    ("1.1.6.1", "Premios de seguro a apropriar", "ATIVO", "1.1.6"),
    ("1.1.6.2", "Alugueis", "ATIVO", "1.1.6"),
    ("1.1.6.3", "IPVA", "ATIVO", "1.1.6"),
    ("1.1.6.4", "Assinatura de Jornais e Revistas", "ATIVO", "1.1.6"),
    ("1.2", "NAO CIRCULANTE", "ATIVO", "1"),
    ("1.2.1", "REALIZAVEL A LONGO PRAZO", "ATIVO", "1.2"),
    ("1.2.1.1", "Clientes", "ATIVO", "1.2.1"),
    ("1.2.1.2", "Contas a Receber", "ATIVO", "1.2.1"),
    ("1.2.1.3", "Despesas Antecipadas", "ATIVO", "1.2.1"),
    ("1.2.1.4", "Depositos Judiciais", "ATIVO", "1.2.1"),
    ("1.2.1.5", "Emprestimo a Socios / Acionistas", "ATIVO", "1.2.1"),
    ("1.2.1.6", "Emprestimos a Empresas Controladas/Coligadas", "ATIVO", "1.2.1"),
    ("1.2.2", "INVESTIMENTOS", "ATIVO", "1.2"),
    ("1.2.2.1", "Participacoes em Controladas/Coligadas", "ATIVO", "1.2.2"),
    ("1.2.2.2", "Participacoes em Outras Empresas", "ATIVO", "1.2.2"),
    ("1.2.2.3", "Outros Investimentos", "ATIVO", "1.2.2"),
    ("1.2.2.4", "(-) Provisao para Perda em Investimento", "ATIVO", "1.2.2"),
    ("1.2.3", "IMOBILIZADO", "ATIVO", "1.2"),
    ("1.2.3.1", "Terrenos", "ATIVO", "1.2.3"),
    ("1.2.3.2", "Imoveis", "ATIVO", "1.2.3"),
    ("1.2.3.3", "Instalacoes", "ATIVO", "1.2.3"),
    ("1.2.3.4", "Maquinas e equipamentos", "ATIVO", "1.2.3"),
    ("1.2.3.5", "Moveis e Utensilios", "ATIVO", "1.2.3"),
    ("1.2.3.6", "Veiculos", "ATIVO", "1.2.3"),
    ("1.2.3.7", "Marcas e Patentes", "ATIVO", "1.2.3"),
    ("1.2.3.8", "(-) Depreciacoes Acumuladas", "ATIVO", "1.2.3"),
    ("1.2.4", "INTANGIVEL", "ATIVO", "1.2"),
    ("1.2.4.1", "Fundo de Comercio Adquirido", "ATIVO", "1.2.4"),
    ("1.2.4.2", "Bens Incorporeos", "ATIVO", "1.2.4"),
    ("1.2.4.3", "(-) Amortizacao Acumulada", "ATIVO", "1.2.4"),
    ("2", "PASSIVO", "PASSIVO", None),
    ("2.1", "CIRCULANTE", "PASSIVO", "2"),
    ("2.1.1", "Fornecedores", "PASSIVO", "2.1"),
    ("2.1.1.1", "Fornecedor A", "PASSIVO", "2.1.1"),
    ("2.1.1.2", "Fornecedor B", "PASSIVO", "2.1.1"),
    ("2.1.2", "Contas a Pagar", "PASSIVO", "2.1"),
    ("2.1.2.1", "Agua", "PASSIVO", "2.1.2"),
    ("2.1.2.2", "Luz", "PASSIVO", "2.1.2"),
    ("2.1.2.3", "Telefone", "PASSIVO", "2.1.2"),
    ("2.1.2.4", "Aluguel", "PASSIVO", "2.1.2"),
    ("2.1.3", "Emprestimos e Financiamentos", "PASSIVO", "2.1"),
    ("2.1.4", "Salarios a Pagar", "PASSIVO", "2.1"),
    ("2.1.5", "Impostos a Pagar", "PASSIVO", "2.1"),
    ("2.1.6", "Provisoes", "PASSIVO", "2.1"),
    ("2.1.6.1", "Provisao para Ferias", "PASSIVO", "2.1.6"),
    ("2.1.6.2", "Provisao para 13 Salario", "PASSIVO", "2.1.6"),
    ("2.1.7", "Dividendos a Pagar", "PASSIVO", "2.1"),
    ("2.2", "NAO CIRCULANTE", "PASSIVO", "2"),
    ("2.2.1", "EXIGIVEL A LONGO PRAZO", "PASSIVO", "2.2"),
    ("2.2.1.1", "Fornecedores", "PASSIVO", "2.2.1"),
    ("2.2.1.2", "Contas a Pagar", "PASSIVO", "2.2.1"),
    ("2.2.1.3", "Emprestimos e Financiamentos", "PASSIVO", "2.2.1"),
    ("2.2.1.4", "Obrigacoes Fiscais", "PASSIVO", "2.2.1"),
    ("2.2.1.5", "Emprestimos de Empresas Controladas/Coligadas", "PASSIVO", "2.2.1"),
    ("2.3", "PATRIMONIO LIQUIDO", "PATRIMONIO_LIQUIDO", "2"),
    ("2.3.1", "Capital Social", "PATRIMONIO_LIQUIDO", "2.3"),
    ("2.3.1.1", "Capital Subscrito", "PATRIMONIO_LIQUIDO", "2.3.1"),
    ("2.3.1.2", "(-) Capital a Integralizar", "PATRIMONIO_LIQUIDO", "2.3.1"),
    ("2.3.2", "Reservas", "PATRIMONIO_LIQUIDO", "2.3"),
    ("2.3.2.1", "De Capital", "PATRIMONIO_LIQUIDO", "2.3.2"),
    ("2.3.2.2", "De Reavaliacao", "PATRIMONIO_LIQUIDO", "2.3.2"),
    ("2.3.2.3", "Legal", "PATRIMONIO_LIQUIDO", "2.3.2"),
    ("2.3.2.4", "Estatutaria", "PATRIMONIO_LIQUIDO", "2.3.2"),
    ("2.3.2.5", "Para Contingencias", "PATRIMONIO_LIQUIDO", "2.3.2"),
    ("2.3.3", "Ajustes de Avaliacao Patrimonial", "PATRIMONIO_LIQUIDO", "2.3"),
    ("2.3.4", "Prejuizos Acumulados", "PATRIMONIO_LIQUIDO", "2.3"),
    ("2.3.4.1", "Prejuizos Exercicios Anteriores", "PATRIMONIO_LIQUIDO", "2.3.4"),
    ("2.3.4.2", "Prejuizos Exercicio Corrente", "PATRIMONIO_LIQUIDO", "2.3.4"),
    ("3", "CONTAS DE RESULTADO", "RESULTADO", None),
    ("3.1", "RECEITA BRUTA DE VENDAS E SERVICOS", "RECEITA", "3"),
    ("3.1.1", "Receita Filial MG", "RECEITA", "3.1"),
    ("3.1.2", "Receita Filial SP", "RECEITA", "3.1"),
    ("3.1.3", "Receita Filial RJ", "RECEITA", "3.1"),
    ("3.2", "VENDAS CANCELADAS", "DESPESA", "3"),
    ("3.2.1", "Filial MG", "DESPESA", "3.2"),
    ("3.2.2", "Filial SP", "DESPESA", "3.2"),
    ("3.2.3", "Filial RJ", "DESPESA", "3.2"),
    ("3.3", "IMPOSTOS SOBRE VENDAS E SERVICOS", "DESPESA", "3"),
    ("3.3.1", "Filial MG", "DESPESA", "3.3"),
    ("3.3.2", "Filial SP", "DESPESA", "3.3"),
    ("3.3.3", "Filial RJ", "DESPESA", "3.3"),
    ("3.4", "CUSTO DA MERCADORIA/PRODUTO E SERVICOS PRESTADOS", "DESPESA", "3"),
    ("3.4.1", "Custo Filial MG", "DESPESA", "3.4"),
    ("3.4.2", "Custo Filial SP", "DESPESA", "3.4"),
    ("3.4.3", "Custo Filial RJ", "DESPESA", "3.4"),
    ("3.5", "DESPESAS OPERACIONAIS", "DESPESA", "3"),
    ("3.5.1", "Despesas Operacionais - MG", "DESPESA", "3.5"),
    ("3.5.1.1", "Despesas com Vendas", "DESPESA", "3.5.1"),
    ("3.5.1.2", "Despesas Gerais e Administrativas", "DESPESA", "3.5.1"),
    ("3.5.1.3", "Encargos Financeiros Liquidos", "DESPESA", "3.5.1"),
    ("3.5.1.4", "Outras Receitas e Despesas Operacionais", "DESPESA", "3.5.1"),
    ("3.5.2", "Despesas Operacionais - SP", "DESPESA", "3.5"),
    ("3.5.2.1", "Despesas com Vendas", "DESPESA", "3.5.2"),
    ("3.5.2.2", "Despesas Gerais e Administrativas", "DESPESA", "3.5.2"),
    ("3.5.2.3", "Encargos Financeiros Liquidos", "DESPESA", "3.5.2"),
    ("3.5.2.4", "Outras Receitas e Despesas Operacionais", "DESPESA", "3.5.2"),
    ("3.5.3", "Despesas Operacionais - RJ", "DESPESA", "3.5"),
    ("3.5.3.1", "Despesas com Vendas", "DESPESA", "3.5.3"),
    ("3.5.3.2", "Despesas Gerais e Administrativas", "DESPESA", "3.5.3"),
    ("3.5.3.3", "Encargos Financeiros Liquidos", "DESPESA", "3.5.3"),
    ("3.5.3.4", "Outras Receitas e Despesas Operacionais", "DESPESA", "3.5.3"),
    ("3.5.4", "Despesas Operacionais - Sede", "DESPESA", "3.5"),
    ("3.5.4.1", "Despesas com Vendas", "DESPESA", "3.5.4"),
    ("3.5.4.2", "Despesas Gerais e Administrativas", "DESPESA", "3.5.4"),
    ("3.5.4.3", "Encargos Financeiros Liquidos", "DESPESA", "3.5.4"),
    ("3.5.4.4", "Outras Receitas e Despesas Operacionais", "DESPESA", "3.5.4"),
    ("3.5.4.5", "Resultado de Equivalencia Patrimonial", "RESULTADO", "3.5.4"),
    ("3.5.4.5.1", "Resultado da Investida A", "RESULTADO", "3.5.4.5"),
    ("3.5.4.5.2", "Resultado da Investida B", "RESULTADO", "3.5.4.5"),
    ("3.6", "OUTRAS RECEITAS OU DESPESAS", "RESULTADO", "3"),
    ("3.6.1", "Filial MG", "RESULTADO", "3.6"),
    ("3.6.1.1", "Receita de Vendas de Bens do Ativo Nao Circulante", "RECEITA", "3.6.1"),
    ("3.6.1.2", "Baixa de Bens do Ativo Nao Circulante", "DESPESA", "3.6.1"),
    ("3.6.2", "Filial SP", "RESULTADO", "3.6"),
    ("3.6.2.1", "Receita de Vendas de Bens do Ativo Nao Circulante", "RECEITA", "3.6.2"),
    ("3.6.2.2", "Baixa de Bens Imobilizados", "DESPESA", "3.6.2"),
    ("3.6.3", "Filial RJ", "RESULTADO", "3.6"),
    ("3.6.3.1", "Receita de Vendas de Bens do Ativo Nao Circulante", "RECEITA", "3.6.3"),
    ("3.6.3.2", "Baixa de Bens do Ativo Nao Circulante", "DESPESA", "3.6.3"),
    ("3.6.4", "Sede", "RESULTADO", "3.6"),
    ("3.6.4.1", "Receita de Vendas de Bens do Ativo Nao Circulante", "RECEITA", "3.6.4"),
    ("3.6.4.2", "Baixa de Bens do Ativo Nao Circulante", "DESPESA", "3.6.4"),
    ("3.6.4.3", "Perda em Investimento", "DESPESA", "3.6.4"),
    ("3.7", "PROVISAO PARA IMPOSTO DE RENDA E CSLL", "DESPESA", "3"),
    ("3.5.4.6", "Agua", "DESPESA", "3.5.4"),
    ("3.5.4.7", "Energia Eletrica", "DESPESA", "3.5.4"),
    ("3.5.4.8", "Internet", "DESPESA", "3.5.4"),
    ("3.5.4.9", "Telefone", "DESPESA", "3.5.4"),
    ("3.5.4.10", "Aluguel", "DESPESA", "3.5.4"),
    ("3.5.4.11", "Material de Limpeza", "DESPESA", "3.5.4"),
    ("3.5.4.12", "Material de Escritorio", "DESPESA", "3.5.4"),
    ("3.5.4.13", "Combustivel", "DESPESA", "3.5.4"),
    ("3.5.4.14", "Manutencao", "DESPESA", "3.5.4"),
    ("3.5.4.15", "Software e Sistemas", "DESPESA", "3.5.4"),
]

async def get_account_id_by_code(db: AsyncSession, code: str):
    result = await db.execute(select(Account).where(Account.code == code))
    account = result.scalar_one_or_none()
    return account.id if account else None

async def infer_account_id_for_entry(db: AsyncSession, entry, ignore_account_id: bool = False):
    if entry.account_id and not ignore_account_id:
        return entry.account_id

    if entry.entry_type == "RECEITA":
        return await get_account_id_by_code(db, "3.1")

        if entry.entry_type == "DESPESA":
            category = (entry.category or "").lower()
            description = (entry.description or "").lower()
            is_tax = "imposto" in category or "imposto" in description

            # Não-baixadas devem ser registradas como passivos (contas a pagar / impostos a pagar)
            if entry.status != "BAIXADO":
                if is_tax:
                    return await get_account_id_by_code(db, "2.1.5")
                if "fornecedor" in category or "fornecedor" in description or "compra" in category or "compra" in description:
                    return await get_account_id_by_code(db, "2.1.2")
                return await get_account_id_by_code(db, "2.1.2")

        # Despesas baixadas são classificadas como contas de resultado
        if is_tax:
            return await get_account_id_by_code(db, "3.3")
        if "agua" in category or "agua" in description:
            return await get_account_id_by_code(db, "3.5.4.6")
        if "luz" in category or "energia" in description:
            return await get_account_id_by_code(db, "3.5.4.7")
        if "telefone" in category or "telefone" in description:
            return await get_account_id_by_code(db, "3.5.4.9")
        if "aluguel" in category or "aluguel" in description:
            return await get_account_id_by_code(db, "3.5.4.10")
        if "combust" in category or "combust" in description:
            return await get_account_id_by_code(db, "3.5.4.13")
        if "manut" in category or "manut" in description:
            return await get_account_id_by_code(db, "3.5.4.14")
        if "material" in category or "material" in description:
            return await get_account_id_by_code(db, "3.5.4.12")
        if "software" in category or "software" in description or "sistema" in category or "sistema" in description:
            return await get_account_id_by_code(db, "3.5.4.15")

        return await get_account_id_by_code(db, "3.5.4.4")

async def seed_default_accounts(db: AsyncSession):
    created = 0
    code_to_id = {
        account.code: account.id
        for account in (await db.execute(select(Account))).scalars().all()
    }

    for code, name, account_type, parent_code in DEFAULT_ACCOUNTS:
        if code in code_to_id:
            continue

        account = Account(
            code=code,
            name=name,
            account_type=account_type,
            parent_id=code_to_id.get(parent_code) if parent_code else None,
        )
        db.add(account)
        await db.flush()
        code_to_id[code] = account.id
        created += 1

    return created

@router.get("/")
async def root():
    return {"message": "ERP Mercearia API"}

@router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    db_user = result.scalar_one_or_none()

    if not db_user or not db_user.active:
        raise HTTPException(status_code=401, detail="E-mail ou senha invalidos")

    if not verify_password(credentials.password, db_user.password):
        raise HTTPException(status_code=401, detail="E-mail ou senha invalidos")

    if not db_user.password.startswith("$pbkdf2-sha256$"):
        db_user.password = hash_password(credentials.password)
        await db.commit()
        await db.refresh(db_user)

    return {"user": db_user}

@router.get("/users", response_model=List[UserSchema])
async def get_users(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "TI"))):
    result = await db.execute(select(User).order_by(User.name))
    return result.scalars().all()

@router.get("/users/lookup")
async def get_users_lookup(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "TI"))):
    result = await db.execute(select(User.id, User.name, User.role).where(User.active == True).order_by(User.name))
    return [
        {
            "id": row.id,
            "name": row.name,
            "role": row.role.value if hasattr(row.role, "value") else str(row.role),
        }
        for row in result.all()
    ]

@router.post("/users", response_model=UserSchema)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "TI"))):
    existing = await db.execute(select(User).where(User.email == user.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="E-mail ja cadastrado")

    user_data = user.model_dump()
    user_data["password"] = hash_password(user.password)
    db_user = User(**user_data)
    db.add(db_user)
    await db.flush()
    await create_audit_log(db, "CREATE", "user", db_user.id, new_data={"email": user.email, "role": user.role})
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.put("/users/{user_id}", response_model=UserSchema)
async def update_user(user_id: int, user: UserUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "TI"))):
    result = await db.execute(select(User).where(User.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    update_data = user.model_dump(exclude_unset=True)
    if "email" in update_data:
        existing = await db.execute(select(User).where(User.email == update_data["email"], User.id != user_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="E-mail ja cadastrado")

    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])
    elif "password" in update_data:
        update_data.pop("password")

    for key, value in update_data.items():
        setattr(db_user, key, value)

    await create_audit_log(db, "UPDATE", "user", user_id, new_data={k: v for k, v in update_data.items() if k != "password"})
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "TI"))):
    result = await db.execute(select(User).where(User.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    db_user.active = False
    await create_audit_log(db, "UPDATE", "user", user_id, new_data={"active": False})
    await db.commit()
    return {"message": "Usuario desativado"}

@router.get("/validate-cnpj")
async def validate_cnpj(cnpj: str):
    """Valida CNPJ contra a API Oficial da Receita Federal"""
    try:
        clean_cnpj = re.sub(r'\D', '', cnpj)
        
        if len(clean_cnpj) != 14:
            raise HTTPException(status_code=400, detail="CNPJ deve ter 14 dígitos")
        
        # Obter token
        token = await get_receita_federal_token()
        
        if not RECEITA_FEDERAL_CPF_USUARIO:
            raise HTTPException(
                status_code=500,
                detail="CPF do usuário não configurado. Configure RECEITA_FEDERAL_CPF_USUARIO no .env"
            )
        
        # Fazer requisição à API Receita Federal
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{RECEITA_FEDERAL_CNPJ_URL}/{clean_cnpj}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "x-cpf-usuario": RECEITA_FEDERAL_CPF_USUARIO
                },
                timeout=10.0
            )
            
            if response.status_code == 404:
                raise HTTPException(status_code=400, detail="CNPJ não encontrado")
            
            if response.status_code != 200:
                print(f"Erro Receita Federal: {response.text}")
                raise HTTPException(status_code=400, detail="CNPJ inválido ou erro ao consultar")
            
            data = response.json()
            
            # Construir endereço completo
            endereco = data.get("endereco", {})
            address = f"{endereco.get('logradouro', '')} {endereco.get('numero', '')}, {endereco.get('bairro', '')}, {endereco.get('municipio', {}).get('descricao', '')} - {endereco.get('uf', '')}, CEP: {endereco.get('cep', '')}".strip()
            # Limpar múltiplas vírgulas e espaços
            address = re.sub(r',\s*,', ',', address).strip().lstrip(',').rstrip(',')
            
            return {
                "valid": True,
                "name": data.get("nomeEmpresarial", ""),
                "fantasy_name": data.get("nomefantasia", ""),
                "address": address,
                "cep": endereco.get("cep", ""),
                "status": data.get("situacaoCadastral", {}).get("motivo", ""),
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao validar CNPJ: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao validar CNPJ")

@router.get("/validate-cep")
async def validate_cep(cep: str):
    """Valida CEP contra a API ViaCEP"""
    try:
        clean_cep = re.sub(r'\D', '', cep)
        
        if len(clean_cep) != 8:
            raise HTTPException(status_code=400, detail="CEP deve ter 8 dígitos")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://viacep.com.br/ws/{clean_cep}/json/",
                timeout=10.0
            )
            data = response.json()
            
            if data.get("erro"):
                raise HTTPException(status_code=400, detail="CEP não encontrado")
            
            return {
                "valid": True,
                "cep": data.get('cep', ''),
                "rua": data.get('logradouro', ''),
                "complemento": data.get('complemento', ''),
                "bairro": data.get('bairro', ''),
                "cidade": data.get('localidade', ''),
                "estado": data.get('uf', ''),
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao validar CEP: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao validar CEP")

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    try:
        # 1. Total de clientes
        total_customers = await db.scalar(select(func.count(Customer.id)))
        
        # 2. Produtos com estoque baixo
        low_stock_query = await db.execute(
            select(Product).where(Product.stock <= Product.min_stock)
        )
        low_stock_products = len(low_stock_query.all())

        # 3. Total de produtos
        total_products = await db.scalar(select(func.count(Product.id)))

        # 4. Vendas (Hoje e Mês) - Usando valores padrão caso seja None
        today = datetime.now(timezone.utc).date()
        start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_today = await db.scalar(
            select(func.sum(Sale.total)).where(func.date(Sale.created_at) == today)
        ) or 0.0

        total_month = await db.scalar(
            select(func.sum(Sale.total)).where(Sale.created_at >= start_of_month)
        ) or 0.0

        # 5. Vendas Recentes - CRUCIAL: usar selectinload para carregar os itens
        # Isso evita o erro "Error extracting attribute" que vimos antes
        recent_sales_query = await db.execute(
            select(Sale)
            .options(selectinload(Sale.items)) # Carrega a relação itens
            .where(Sale.created_at >= start_of_month)
            .order_by(Sale.created_at.desc())
            .limit(5)
        )
        recent_sales = recent_sales_query.scalars().all()

        return {
            "total_sales_today": float(total_today),
            "total_sales_month": float(total_month),
            "total_customers": int(total_customers or 0),
            "low_stock_products": int(low_stock_products),
            "total_products": int(total_products or 0),
            "recent_sales": recent_sales
        }
    except Exception as e:
        # Isso ajudará a ver o erro real no console do Python
        print(f"ERRO NO DASHBOARD: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/categories")
async def get_categories(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(distinct(Product.category))
    )

    categories = result.scalars().all()

    clean_categories = sorted(
        list({
            category.strip().title()
            for category in categories
            if category and category.strip()
        })
    )

    return clean_categories

@router.get("/products", response_model=List[ProductSchema])
async def get_products(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/products/{product_id}", response_model=ProductSchema)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product

@router.post("/products", response_model=ProductSchema)
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE"))):
    existing = await db.execute(select(Product).where(Product.sku == product.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="SKU ja cadastrado")

    product_dict = product.model_dump()
    product_dict.pop('profit_margin', None)  # Remove profit_margin since it's a property, not a column
    db_product = Product(**product_dict)
    try:
        db.add(db_product)
        await db.flush()
        new_data = product.model_dump()
        new_data.pop('profit_margin', None)
        await create_audit_log(db, "CREATE", "product", db_product.id, new_data=new_data)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Produto com dados duplicados")
    await db.refresh(db_product)
    return db_product

@router.put("/products/{product_id}", response_model=ProductSchema)
async def update_product(product_id: int, product: ProductUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE"))):
    result = await db.execute(select(Product).where(Product.id == product_id))
    db_product = result.scalar_one_or_none()
    if not db_product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    old_data = {"name": db_product.name, "cost_price": db_product.cost_price, "sale_price": db_product.sale_price}
    
    update_data = product.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
    
    await create_audit_log(db, "UPDATE", "product", product_id, old_data=old_data, new_data=update_data)
    await db.commit()
    await db.refresh(db_product)
    return db_product

@router.get("/categories")
async def get_categories(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(distinct(Product.category))
    )

    categories = result.scalars().all()

    return [
        category
        for category in categories
        if category and category.strip()
    ]

@router.delete("/products/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE"))):
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        db_product = result.scalar_one_or_none()
        if not db_product:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        # Check if product is used in any sales
        sale_item_count = await db.scalar(select(func.count(SaleItem.id)).where(SaleItem.product_id == product_id))
        if sale_item_count > 0:
            raise HTTPException(status_code=400, detail="Produto não pode ser deletado pois está sendo usado em vendas")
        
        await create_audit_log(db, "DELETE", "product", product_id, old_data={"name": db_product.name})
        await db.delete(db_product)
        await db.commit()
        return {"message": "Produto deletado"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO AO DELETAR PRODUTO: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/purchase-needs", response_model=List[PurchaseNeedReport])
async def get_purchase_need_report(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "COMPRADOR"))):
    """
    Relatório de necessidade de compra - RF05
    Mostra produtos que precisam ser comprados baseado em:
    - Estoque atual < estoque mínimo
    - Vendas médias diárias
    - Dias desde última compra
    """
    try:
        # Query para obter produtos com informações de vendas e compras
        query = select(
            Product.id,
            Product.name,
            Product.sku,
            Product.stock,
            Product.min_stock,
            func.coalesce(func.avg(SaleItem.quantity), 0).label('avg_daily_sales'),
            func.max(Purchase.created_at).label('last_purchase_date')
        ).select_from(Product).outerjoin(
            SaleItem, Product.id == SaleItem.product_id
        ).outerjoin(
            Sale, SaleItem.sale_id == Sale.id
        ).outerjoin(
            PurchaseItem, Product.id == PurchaseItem.product_id
        ).outerjoin(
            Purchase, PurchaseItem.purchase_id == Purchase.id
        ).where(
            Product.active == True
        ).group_by(
            Product.id, Product.name, Product.sku, Product.stock, Product.min_stock
        )

        result = await db.execute(query)
        products_data = result.all()

        report_items = []
        now = datetime.now(timezone.utc)

        for row in products_data:
            current_stock = row.stock
            min_stock = row.min_stock
            avg_daily_sales = float(row.avg_daily_sales or 0)
            last_purchase_date = row.last_purchase_date

            # Calcular dias desde última compra
            days_since_last_purchase = None
            if last_purchase_date:
                days_since_last_purchase = (now - last_purchase_date).days

            # Calcular quantidade sugerida para compra
            # Lógica: se estoque < min_stock, sugerir quantidade para atingir 2x o min_stock
            # Considerar também vendas médias para próximos 30 dias
            suggested_quantity = 0
            if current_stock < min_stock:
                # Quantidade para atingir pelo menos 2x o estoque mínimo
                base_quantity = max(0, (min_stock * 2) - current_stock)
                # Adicionar buffer baseado em vendas médias (30 dias)
                sales_buffer = int(avg_daily_sales * 30)
                suggested_quantity = base_quantity + sales_buffer

            # Determinar prioridade
            priority = "LOW"
            if current_stock == 0:
                priority = "CRITICAL"
            elif current_stock < min_stock:
                if avg_daily_sales > 0:
                    if current_stock / avg_daily_sales < 7:  # Menos de 7 dias de estoque
                        priority = "HIGH"
                    else:
                        priority = "MEDIUM"
                else:
                    # Sem histórico de vendas mas abaixo do mínimo = Alta Prioridade
                    priority = "HIGH"

            if suggested_quantity > 0:
                report_items.append(PurchaseNeedReport(
                    product_id=row.id,
                    product_name=row.name,
                    sku=row.sku,
                    current_stock=current_stock,
                    min_stock=min_stock,
                    suggested_quantity=suggested_quantity,
                    average_daily_sales=round(avg_daily_sales, 2),
                    last_purchase_date=last_purchase_date,
                    days_since_last_purchase=days_since_last_purchase,
                    priority=priority
                ))

        # Ordenar por prioridade (CRITICAL primeiro) e depois por quantidade sugerida
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        report_items.sort(key=lambda x: (priority_order.get(x.priority, 4), -x.suggested_quantity))

        return report_items

    except Exception as e:
        print(f"ERRO NO RELATÓRIO DE NECESSIDADE DE COMPRA: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")

@router.get("/customers", response_model=List[CustomerSchema])
async def get_customers(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/customers/{customer_id}", response_model=CustomerSchema)
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return customer

@router.post("/customers", response_model=CustomerSchema)
async def create_customer(customer: CustomerCreate, db: AsyncSession = Depends(get_db)):
    if customer.cpf_cnpj:
        customer.cpf_cnpj = validate_cpf_cnpj_document(customer.cpf_cnpj, allow_cpf=True)
    if customer.email:
        existing = await db.execute(select(Customer).where(Customer.email == customer.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="E-mail ja cadastrado")
    if customer.cpf_cnpj:
        existing = await db.execute(select(Customer).where(Customer.cpf_cnpj == customer.cpf_cnpj))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="CPF/CNPJ ja cadastrado")

    db_customer = Customer(**customer.model_dump())
    try:
        db.add(db_customer)
        await db.flush()
        await create_audit_log(db, "CREATE", "customer", db_customer.id, new_data=customer.model_dump())
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Cliente com e-mail ou CPF/CNPJ ja cadastrado")
    await db.refresh(db_customer)
    return db_customer

@router.put("/customers/{customer_id}", response_model=CustomerSchema)
async def update_customer(customer_id: int, customer: CustomerUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    db_customer = result.scalar_one_or_none()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    old_data = {"name": db_customer.name, "email": db_customer.email}
    update_data = customer.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"]:
        existing = await db.execute(select(Customer).where(Customer.email == update_data["email"], Customer.id != customer_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="E-mail ja cadastrado")

    for key, value in update_data.items():
        setattr(db_customer, key, value)
    
    await create_audit_log(db, "UPDATE", "customer", customer_id, old_data=old_data, new_data=update_data)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Cliente com dados duplicados")
    await db.refresh(db_customer)
    return db_customer

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    db_customer = result.scalar_one_or_none()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    await create_audit_log(db, "DELETE", "customer", customer_id, old_data={"name": db_customer.name})
    await db.delete(db_customer)
    await db.commit()
    return {"message": "Cliente deletado"}

@router.get("/suppliers", response_model=List[SupplierSchema])
async def get_suppliers(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "COMPRADOR"))):
    result = await db.execute(select(Supplier).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/suppliers/{supplier_id}", response_model=SupplierSchema)
async def get_supplier(supplier_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "COMPRADOR"))):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return supplier

@router.post("/suppliers", response_model=SupplierSchema)
async def create_supplier(supplier: SupplierCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "COMPRADOR"))):
    if supplier.cnpj:
        supplier.cnpj = validate_cpf_cnpj_document(supplier.cnpj, allow_cpf=False)
    if supplier.email:
        existing = await db.execute(select(Supplier).where(Supplier.email == supplier.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="E-mail ja cadastrado")
    if supplier.cnpj:
        existing = await db.execute(select(Supplier).where(Supplier.cnpj == supplier.cnpj))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="CNPJ ja cadastrado")

    db_supplier = Supplier(**supplier.model_dump())
    try:
        db.add(db_supplier)
        await db.flush()
        await create_audit_log(db, "CREATE", "supplier", db_supplier.id, new_data=supplier.model_dump())
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Fornecedor com e-mail ou CNPJ ja cadastrado")
    await db.refresh(db_supplier)
    return db_supplier

@router.put("/suppliers/{supplier_id}", response_model=SupplierSchema)
async def update_supplier(supplier_id: int, supplier: SupplierUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "COMPRADOR"))):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    db_supplier = result.scalar_one_or_none()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    old_data = {"name": db_supplier.name, "email": db_supplier.email}
    update_data = supplier.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"]:
        existing = await db.execute(select(Supplier).where(Supplier.email == update_data["email"], Supplier.id != supplier_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="E-mail ja cadastrado")

    for key, value in update_data.items():
        setattr(db_supplier, key, value)
    
    await create_audit_log(db, "UPDATE", "supplier", supplier_id, old_data=old_data, new_data=update_data)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Fornecedor com dados duplicados")
    await db.refresh(db_supplier)
    return db_supplier

@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "COMPRADOR"))):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    db_supplier = result.scalar_one_or_none()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    await create_audit_log(db, "DELETE", "supplier", supplier_id, old_data={"name": db_supplier.name})
    await db.delete(db_supplier)
    await db.commit()
    return {"message": "Fornecedor deletado"}

@router.get("/sales", response_model=List[SaleSchema])
async def get_sales(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "VENDEDOR", "ATENDENTE"))):
    result = await db.execute(
        select(Sale).options(selectinload(Sale.items)).order_by(Sale.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/sales/{sale_id}", response_model=SaleSchema)
async def get_sale(sale_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "VENDEDOR", "ATENDENTE"))):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return sale

@router.post("/sales", response_model=SaleSchema)
async def create_sale(sale: SaleCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "VENDEDOR", "ATENDENTE"))):
    total = 0
    sale_items = []
    
    for item in sale.items:
        result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item.product_id} não encontrado")
        
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {product.name}")
        
        subtotal = item.quantity * item.unit_price
        total += subtotal
        sale_items.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "subtotal": subtotal
        })
        
        product.stock -= item.quantity
        
        stock_movement = StockMovement(
            product_id=product.id,
            movement_type="SAIDA",
            quantity=item.quantity,
            reason="Venda"
        )
        db.add(stock_movement)
    
    db_sale = Sale(
        customer_id=sale.customer_id,
        total=total - sale.discount,
        discount=sale.discount,
        payment_method=sale.payment_method,
        status="COMPLETED"
    )
    db.add(db_sale)
    await db.flush()
    
    for item_data in sale_items:
        sale_item = SaleItem(sale_id=db_sale.id, **item_data)
        db.add(sale_item)
    
    financial_entry = FinancialEntry(
        entry_type="RECEITA",
        amount=total - sale.discount,
        category="Venda",
        description=f"Venda #{db_sale.id}",
        reference_id=db_sale.id,
        account_id=await get_account_id_by_code(db, "1.1.3.1"),
        status="PENDENTE"
    )
    db.add(financial_entry)

    tax_amount = (total - sale.discount) * 0.10
    tax_entry = FinancialEntry(
        entry_type="DESPESA",
        amount=tax_amount,
        category="Imposto sobre venda",
        description=f"Imposto simples 10% - Venda #{db_sale.id}",
        reference_id=db_sale.id,
        account_id=await get_account_id_by_code(db, "3.3"),
        status="PENDENTE"
    )
    db.add(tax_entry)
    
    await create_audit_log(db, "CREATE", "sale", db_sale.id, new_data={"total": total, "items": len(sale_items)})
    await db.commit()
    await db.refresh(db_sale)
    return db_sale

@router.get("/purchases", response_model=List[PurchaseSchema])
async def get_purchases(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "COMPRADOR"))):
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .order_by(Purchase.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/purchases", response_model=PurchaseSchema)
async def create_purchase(purchase: PurchaseCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "COMPRADOR"))):
    total = 0
    purchase_items = []
    
    for item in purchase.items:
        result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item.product_id} não encontrado")
        
        subtotal = item.quantity * item.unit_price
        total += subtotal
        purchase_items.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "subtotal": subtotal
        })
        
        previous_stock = product.stock
        previous_cost_total = previous_stock * product.cost_price
        purchase_cost_total = item.quantity * item.unit_price
        product.stock += item.quantity
        product.cost_price = (previous_cost_total + purchase_cost_total) / product.stock if product.stock else item.unit_price
        
        stock_movement = StockMovement(
            product_id=product.id,
            movement_type="ENTRADA",
            quantity=item.quantity,
            reason="Compra"
        )
        db.add(stock_movement)
    
    # Aplicar desconto ao total (não pode ser maior que o total)
    if purchase.discount > total:
        raise HTTPException(status_code=400, detail="Desconto não pode ser maior que o valor total da compra")
    final_total = total - purchase.discount
    
    db_purchase = Purchase(
        supplier_id=purchase.supplier_id,
        total=final_total,
        discount=purchase.discount,
        payment_method=purchase.payment_method,
        order_number=purchase.order_number,
        invoice_number=purchase.invoice_number,
        status="RECEIVED",
        received_at=datetime.now(timezone.utc)
    )
    db.add(db_purchase)
    await db.flush()
    
    for item_data in purchase_items:
        purchase_item = PurchaseItem(
            purchase_id=db_purchase.id,
            product_id=item_data["product_id"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            subtotal=item_data["subtotal"]
        )
        db.add(purchase_item)
    
    financial_entry = FinancialEntry(
        entry_type="DESPESA",
        amount=final_total,
        category="Compra",
        description=f"Compra #{db_purchase.id}",
        reference_id=db_purchase.id,
        account_id=await get_account_id_by_code(db, "2.1.2"),
        status="PENDENTE"
    )
    db.add(financial_entry)
    
    await create_audit_log(db, "CREATE", "purchase", db_purchase.id, new_data={"total": final_total, "discount": purchase.discount, "items": len(purchase_items)})
    await db.commit()
    await db.refresh(db_purchase)
    return db_purchase

@router.get("/stock", response_model=List[ProductSchema])
async def get_stock(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).order_by(Product.name))
    return result.scalars().all()

@router.get("/stock/movements", response_model=List[StockMovementSchema])
async def get_stock_movements(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockMovement).order_by(StockMovement.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.post("/stock/movement", response_model=StockMovementSchema)
async def create_stock_movement(movement: StockMovementCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE"))):
    result = await db.execute(select(Product).where(Product.id == movement.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    if movement.movement_type == "ENTRADA":
        product.stock += movement.quantity
    elif movement.movement_type == "SAIDA":
        if product.stock < movement.quantity:
            raise HTTPException(status_code=400, detail="Estoque insuficiente")
        product.stock -= movement.quantity
    elif movement.movement_type == "AJUSTE":
        product.stock = movement.quantity
    
    db_movement = StockMovement(**movement.model_dump(), user_id=current_user_id.get())
    db.add(db_movement)
    await db.flush()
    movement_value = abs(movement.quantity) * float(product.cost_price or 0)
    if movement_value > 0:
        db.add(FinancialEntry(
            entry_type="DESPESA" if movement.movement_type in ["SAIDA", "AJUSTE"] else "RECEITA",
            amount=movement_value,
            category="Movimentacao de estoque",
            description=f"{movement.movement_type} de estoque - {product.name}",
            reference_id=db_movement.id,
            account_id=await get_account_id_by_code(db, "1.1.5.1"),
            status="BAIXADO"
        ))
    await create_audit_log(db, "CREATE", "stock_movement", db_movement.id, new_data=movement.model_dump())
    await db.commit()
    await db.refresh(db_movement)
    return db_movement

@router.get("/financial/entries", response_model=List[FinancialEntrySchema])
async def get_financial_entries(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(
        select(FinancialEntry).order_by(FinancialEntry.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/financial/payables", response_model=List[FinancialEntrySchema])
async def get_payables(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(
        select(FinancialEntry)
        .where(FinancialEntry.entry_type == "DESPESA")
        .order_by(FinancialEntry.due_date.asc().nullslast(), FinancialEntry.created_at.desc())
    )
    return result.scalars().all()

@router.get("/financial/receivables", response_model=List[FinancialEntrySchema])
async def get_receivables(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(
        select(FinancialEntry)
        .where(FinancialEntry.entry_type == "RECEITA", FinancialEntry.status == "PENDENTE")
        .order_by(FinancialEntry.due_date.asc().nullslast(), FinancialEntry.created_at.desc())
    )
    return result.scalars().all()

@router.get("/financial/cashflow")
async def get_cashflow(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))
):
    total_receitas = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(
            FinancialEntry.entry_type == "RECEITA",
            FinancialEntry.status == "BAIXADO"
        )
    ) or 0

    total_despesas = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(
            FinancialEntry.entry_type == "DESPESA",
            FinancialEntry.status == "BAIXADO"
        )
    ) or 0

    return {
        "receitas": float(total_receitas),
        "despesas": float(total_despesas),
        "saldo": float(total_receitas - total_despesas)
    }

@router.get("/financial/profitability", response_model=ProfitabilityReport)
async def get_profitability_report(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(
        select(
            Product.id,
            Product.name,
            Product.sku,
            Product.cost_price,
            func.coalesce(func.sum(SaleItem.quantity), 0).label("quantity_sold"),
            func.coalesce(func.sum(SaleItem.subtotal), 0).label("revenue"),
        )
        .select_from(Product)
        .join(SaleItem, Product.id == SaleItem.product_id, isouter=True)
        .group_by(Product.id, Product.name, Product.sku, Product.cost_price)
        .order_by(Product.name)
    )

    items = []
    total_revenue = 0.0
    total_estimated_cost = 0.0

    for row in result.all():
        quantity_sold = int(row.quantity_sold or 0)
        revenue = float(row.revenue or 0)
        estimated_cost = float(row.cost_price or 0) * quantity_sold
        profit = revenue - estimated_cost
        margin_percent = (profit / revenue * 100) if revenue else 0.0
        total_revenue += revenue
        total_estimated_cost += estimated_cost
        items.append({
            "product_id": row.id,
            "product_name": row.name,
            "sku": row.sku,
            "quantity_sold": quantity_sold,
            "revenue": revenue,
            "estimated_cost": estimated_cost,
            "profit": profit,
            "margin_percent": margin_percent,
        })

    total_profit = total_revenue - total_estimated_cost
    return {
        "total_revenue": total_revenue,
        "total_estimated_cost": total_estimated_cost,
        "total_profit": total_profit,
        "margin_percent": (total_profit / total_revenue * 100) if total_revenue else 0.0,
        "items": items,
    }

@router.post("/financial/entries", response_model=FinancialEntrySchema)
async def create_financial_entry(entry: FinancialEntryCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    due_date = None

    if entry.due_date:
        if isinstance(entry.due_date, str):
            due_date = datetime.strptime(entry.due_date, "%Y-%m-%d").date()
        else:
            due_date = entry.due_date

    account_id = await infer_account_id_for_entry(db, entry)

    db_entry = FinancialEntry(
        entry_type=entry.entry_type,
        amount=entry.amount,
        category=entry.category,
        description=entry.description,
        account_id=account_id,
        due_date=due_date,
        status=entry.status
    )

    db.add(db_entry)

    await db.commit()
    await db.refresh(db_entry)

    return db_entry


@router.put("/financial/entries/{entry_id}", response_model=FinancialEntrySchema)
async def update_financial_entry(entry_id: int, entry: FinancialEntryUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(select(FinancialEntry).where(FinancialEntry.id == entry_id))
    db_entry = result.scalar_one_or_none()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Lancamento nao encontrado")
    if db_entry.status == "BAIXADO":
        raise HTTPException(status_code=400, detail="Lancamento baixado nao pode ser editado sem estorno")

    update_data = entry.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_entry, key, value)

    await create_audit_log(db, "UPDATE", "financial_entry", entry_id, new_data=update_data)
    await db.commit()
    await db.refresh(db_entry)
    return db_entry

@router.put("/financial/entries/{entry_id}/settle", response_model=FinancialEntrySchema)
async def settle_financial_entry(entry_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(select(FinancialEntry).where(FinancialEntry.id == entry_id))
    db_entry = result.scalar_one_or_none()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Lancamento nao encontrado")
    if db_entry.status == "BAIXADO":
        raise HTTPException(status_code=400, detail="Lancamento ja baixado")

    db_entry.status = "BAIXADO"
    db_entry.settled_at = datetime.now(timezone.utc)
    if db_entry.entry_type == "DESPESA":
        db_entry.account_id = await infer_account_id_for_entry(db, db_entry, ignore_account_id=True)
    await create_audit_log(db, "UPDATE", "financial_entry", entry_id, new_data={"status": "BAIXADO"})
    await db.commit()
    await db.refresh(db_entry)
    return db_entry

@router.put("/financial/entries/{entry_id}/reverse", response_model=FinancialEntrySchema)
async def reverse_financial_entry(entry_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(select(FinancialEntry).where(FinancialEntry.id == entry_id))
    db_entry = result.scalar_one_or_none()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Lancamento nao encontrado")

    db_entry.status = "PENDENTE"
    db_entry.settled_at = None
    if db_entry.entry_type == "DESPESA":
        db_entry.account_id = await infer_account_id_for_entry(db, db_entry, ignore_account_id=True)
    await create_audit_log(db, "UPDATE", "financial_entry", entry_id, new_data={"status": "PENDENTE"})
    await db.commit()
    await db.refresh(db_entry)
    return db_entry

@router.get("/accounts", response_model=List[AccountSchema])
async def get_accounts(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(select(Account).order_by(Account.code))
    return result.scalars().all()

@router.post("/accounts/seed-default")
async def seed_accounts_endpoint(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    created = await seed_default_accounts(db)
    await db.commit()
    return {"created": created}

@router.post("/accounts", response_model=AccountSchema)
async def create_account(account: AccountCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    db_account = Account(**account.model_dump())
    db.add(db_account)
    await db.flush()
    await create_audit_log(db, "CREATE", "account", db_account.id, new_data=account.model_dump())
    await db.commit()
    await db.refresh(db_account)
    return db_account

@router.put("/accounts/{account_id}", response_model=AccountSchema)
async def update_account(account_id: int, account: AccountUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    result = await db.execute(select(Account).where(Account.id == account_id))
    db_account = result.scalar_one_or_none()
    if not db_account:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")

    update_data = account.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_account, key, value)

    await create_audit_log(db, "UPDATE", "account", account_id, new_data=update_data)
    await db.commit()
    await db.refresh(db_account)
    return db_account

@router.delete("/accounts/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    db_account = await db.scalar(select(Account).where(Account.id == account_id))
    if not db_account:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")

    children = await db.scalar(select(func.count(Account.id)).where(Account.parent_id == account_id))
    entries = await db.scalar(select(func.count(FinancialEntry.id)).where(FinancialEntry.account_id == account_id))
    if children or entries:
        db_account.active = False
        await create_audit_log(db, "UPDATE", "account", account_id, new_data={"active": False})
        await db.commit()
        return {"message": "Conta desativada por possuir vinculos"}

    await db.delete(db_account)
    await create_audit_log(db, "DELETE", "account", account_id, old_data={"code": db_account.code, "name": db_account.name})
    await db.commit()
    return {"message": "Conta deletada"}

@router.get("/accounting/balance-sheet", response_model=BalanceSheetReport)
async def get_balance_sheet(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))
):
    ativos = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .join(Account, Account.id == FinancialEntry.account_id)
        .where(Account.account_type == "ATIVO")
    ) or 0

    passivos = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .join(Account, Account.id == FinancialEntry.account_id)
        .where(Account.account_type == "PASSIVO")
    ) or 0

    # Incluir passivos vindos de despesas pendentes que ainda não foram baixadas
    pending_expenses_as_liabilities = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .join(Account, Account.id == FinancialEntry.account_id)
        .where(
            FinancialEntry.entry_type == "DESPESA",
            FinancialEntry.status != "BAIXADO",
            Account.account_type != "PASSIVO"
        )
    ) or 0
    passivos += pending_expenses_as_liabilities

    patrimonio_base = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .join(Account, Account.id == FinancialEntry.account_id)
        .where(Account.account_type == "PATRIMONIO_LIQUIDO")
    ) or 0

    receitas = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(FinancialEntry.entry_type == "RECEITA", FinancialEntry.status == "BAIXADO")
    ) or 0

    despesas = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(
            FinancialEntry.entry_type == "DESPESA",
            FinancialEntry.status == "BAIXADO",
            ~FinancialEntry.category.ilike("%imposto%"),
            ~FinancialEntry.description.ilike("%imposto%")
        )
    ) or 0

    impostos = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(
            FinancialEntry.entry_type == "DESPESA",
            FinancialEntry.status == "BAIXADO",
            or_(
                FinancialEntry.category.ilike("%imposto%"),
                FinancialEntry.description.ilike("%imposto%")
            )
        )
    ) or 0

    resultado_acumulado = receitas - despesas - impostos

    return {
        "ativos": float(ativos),
        "passivos": float(passivos),
        "patrimonio_liquido": float(patrimonio_base),
        "resultado_acumulado": float(resultado_acumulado),
    }

@router.get("/accounting/income-statement", response_model=IncomeStatementReport)
async def get_income_statement(db: AsyncSession = Depends(get_db), _: User = Depends(require_roles("ADMIN", "GERENTE", "FINANCEIRO"))):
    receitas = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(FinancialEntry.entry_type == "RECEITA", FinancialEntry.status == "BAIXADO")
    ) or 0

    despesas = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(
            FinancialEntry.entry_type == "DESPESA",
            FinancialEntry.status == "BAIXADO",
            ~FinancialEntry.category.ilike("%imposto%"),
            ~FinancialEntry.description.ilike("%imposto%")
        )
    ) or 0

    impostos = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(
            FinancialEntry.entry_type == "DESPESA",
            FinancialEntry.status == "BAIXADO",
            or_(
                FinancialEntry.category.ilike("%imposto%"),
                FinancialEntry.description.ilike("%imposto%")
            )
        )
    ) or 0

    lucro_bruto = float(receitas)
    resultado_liquido = float(receitas - despesas - impostos)

    return {
        "receitas": float(receitas),
        "despesas": float(despesas),
        "impostos": float(impostos),
        "lucro_bruto": float(lucro_bruto),
        "resultado_liquido": float(resultado_liquido),
    }

@router.get("/audit-logs", response_model=List[AuditLogSchema])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    entity: Optional[str] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("ADMIN", "AUDITOR"))
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())
    
    if entity:
        query = query.where(AuditLog.entity == entity)
    if action:
        query = query.where(AuditLog.action == action)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()