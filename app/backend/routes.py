from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from database import get_db
from models import Product, Customer, Supplier, Sale, SaleItem, Purchase, PurchaseItem, StockMovement, FinancialEntry, Account, AuditLog
from schemas import (
    ProductCreate, ProductUpdate, Product as ProductSchema,
    CustomerCreate, CustomerUpdate, Customer as CustomerSchema,
    SupplierCreate, SupplierUpdate, Supplier as SupplierSchema,
    SaleCreate, Sale as SaleSchema,
    PurchaseCreate, Purchase as PurchaseSchema,
    StockMovementCreate, StockMovement as StockMovementSchema,
    FinancialEntryCreate, FinancialEntry as FinancialEntrySchema,
    AccountCreate, Account as AccountSchema,
    AuditLog as AuditLogSchema,
    DashboardStats
)
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import json
import httpx
import re
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api")

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
        action=action,
        entity=entity,
        entity_id=entity_id,
        old_data=json.dumps(old_data) if old_data else None,
        new_data=json.dumps(new_data) if new_data else None
    )
    db.add(audit)

@router.get("/")
async def root():
    return {"message": "ERP Mercearia API"}

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
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db)):
    db_product = Product(**product.model_dump())
    db.add(db_product)
    await db.flush()
    await create_audit_log(db, "CREATE", "product", db_product.id, new_data=product.model_dump())
    await db.commit()
    await db.refresh(db_product)
    return db_product

@router.put("/products/{product_id}", response_model=ProductSchema)
async def update_product(product_id: int, product: ProductUpdate, db: AsyncSession = Depends(get_db)):
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

@router.delete("/products/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
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
    db_customer = Customer(**customer.model_dump())
    db.add(db_customer)
    await db.flush()
    await create_audit_log(db, "CREATE", "customer", db_customer.id, new_data=customer.model_dump())
    await db.commit()
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
    for key, value in update_data.items():
        setattr(db_customer, key, value)
    
    await create_audit_log(db, "UPDATE", "customer", customer_id, old_data=old_data, new_data=update_data)
    await db.commit()
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
async def get_suppliers(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/suppliers/{supplier_id}", response_model=SupplierSchema)
async def get_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return supplier

@router.post("/suppliers", response_model=SupplierSchema)
async def create_supplier(supplier: SupplierCreate, db: AsyncSession = Depends(get_db)):
    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    await db.flush()
    await create_audit_log(db, "CREATE", "supplier", db_supplier.id, new_data=supplier.model_dump())
    await db.commit()
    await db.refresh(db_supplier)
    return db_supplier

@router.put("/suppliers/{supplier_id}", response_model=SupplierSchema)
async def update_supplier(supplier_id: int, supplier: SupplierUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    db_supplier = result.scalar_one_or_none()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    old_data = {"name": db_supplier.name, "email": db_supplier.email}
    update_data = supplier.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_supplier, key, value)
    
    await create_audit_log(db, "UPDATE", "supplier", supplier_id, old_data=old_data, new_data=update_data)
    await db.commit()
    await db.refresh(db_supplier)
    return db_supplier

@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    db_supplier = result.scalar_one_or_none()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    await create_audit_log(db, "DELETE", "supplier", supplier_id, old_data={"name": db_supplier.name})
    await db.delete(db_supplier)
    await db.commit()
    return {"message": "Fornecedor deletado"}

@router.get("/sales", response_model=List[SaleSchema])
async def get_sales(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Sale).options(selectinload(Sale.items)).order_by(Sale.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/sales/{sale_id}", response_model=SaleSchema)
async def get_sale(sale_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return sale

@router.post("/sales", response_model=SaleSchema)
async def create_sale(sale: SaleCreate, db: AsyncSession = Depends(get_db)):
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
        reference_id=db_sale.id
    )
    db.add(financial_entry)
    
    await create_audit_log(db, "CREATE", "sale", db_sale.id, new_data={"total": total, "items": len(sale_items)})
    await db.commit()
    await db.refresh(db_sale)
    return db_sale

@router.get("/purchases", response_model=List[PurchaseSchema])
async def get_purchases(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Purchase).order_by(Purchase.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.post("/purchases", response_model=PurchaseSchema)
async def create_purchase(purchase: PurchaseCreate, db: AsyncSession = Depends(get_db)):
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
        
        product.stock += item.quantity
        product.cost_price = item.unit_price
        
        stock_movement = StockMovement(
            product_id=product.id,
            movement_type="ENTRADA",
            quantity=item.quantity,
            reason="Compra"
        )
        db.add(stock_movement)
    
    db_purchase = Purchase(
        supplier_id=purchase.supplier_id,
        total=total,
        payment_method=purchase.payment_method,
        status="COMPLETED"
    )
    db.add(db_purchase)
    await db.flush()
    
    for item_data in purchase_items:
        purchase_item = PurchaseItem(purchase_id=db_purchase.id, **item_data)
        db.add(purchase_item)
    
    financial_entry = FinancialEntry(
        entry_type="DESPESA",
        amount=total,
        category="Compra",
        description=f"Compra #{db_purchase.id}",
        reference_id=db_purchase.id
    )
    db.add(financial_entry)
    
    await create_audit_log(db, "CREATE", "purchase", db_purchase.id, new_data={"total": total, "items": len(purchase_items)})
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
async def create_stock_movement(movement: StockMovementCreate, db: AsyncSession = Depends(get_db)):
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
    
    db_movement = StockMovement(**movement.model_dump())
    db.add(db_movement)
    await db.flush()
    await create_audit_log(db, "CREATE", "stock_movement", db_movement.id, new_data=movement.model_dump())
    await db.commit()
    await db.refresh(db_movement)
    return db_movement

@router.get("/financial/entries", response_model=List[FinancialEntrySchema])
async def get_financial_entries(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FinancialEntry).order_by(FinancialEntry.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/financial/cashflow")
async def get_cashflow(db: AsyncSession = Depends(get_db)):
    receitas = await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(FinancialEntry.entry_type == "RECEITA")
    )
    total_receitas = receitas.scalar() or 0
    
    despesas = await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.amount), 0))
        .where(FinancialEntry.entry_type == "DESPESA")
    )
    total_despesas = despesas.scalar() or 0
    
    return {
        "receitas": float(total_receitas),
        "despesas": float(total_despesas),
        "saldo": float(total_receitas - total_despesas)
    }

@router.post("/financial/entries", response_model=FinancialEntrySchema)
async def create_financial_entry(entry: FinancialEntryCreate, db: AsyncSession = Depends(get_db)):
    db_entry = FinancialEntry(**entry.model_dump())
    db.add(db_entry)
    await db.flush()
    await create_audit_log(db, "CREATE", "financial_entry", db_entry.id, new_data=entry.model_dump())
    await db.commit()
    await db.refresh(db_entry)
    return db_entry

@router.get("/accounts", response_model=List[AccountSchema])
async def get_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).order_by(Account.code))
    return result.scalars().all()

@router.post("/accounts", response_model=AccountSchema)
async def create_account(account: AccountCreate, db: AsyncSession = Depends(get_db)):
    db_account = Account(**account.model_dump())
    db.add(db_account)
    await db.flush()
    await create_audit_log(db, "CREATE", "account", db_account.id, new_data=account.model_dump())
    await db.commit()
    await db.refresh(db_account)
    return db_account

@router.get("/audit-logs", response_model=List[AuditLogSchema])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    entity: Optional[str] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())
    
    if entity:
        query = query.where(AuditLog.entity == entity)
    if action:
        query = query.where(AuditLog.action == action)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
