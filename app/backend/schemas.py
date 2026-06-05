from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "VENDEDOR"
    active: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None

class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str
    active: bool
    created_at: datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    user: User

class ProductBase(BaseModel):
    name: str
    sku: str
    cost_price: float = 0.0
    sale_price: float = 0.0
    stock: int = 0
    min_stock: int = 10
    category: Optional[str] = None
    unit: str = "UN"
    active: bool = True

    profit_margin: Optional[float] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    stock: Optional[int] = None
    min_stock: Optional[int] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    active: Optional[bool] = None

class Product(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class CustomerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Customer(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class SupplierBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cnpj: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Supplier(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class SaleItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: float

class SaleItem(SaleItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Se você quiser incluir o nome do produto na lista de itens:
    # product: Optional[Product] = None 

class SaleBase(BaseModel):
    customer_id: Optional[int] = None
    total: float = 0.0
    discount: float = 0.0
    payment_method: Optional[str] = None
    status: str = "PENDING"

class SaleCreate(SaleBase):
    items: List[SaleItemBase]

class Sale(SaleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    # O PROBLEMA ESTAVA AQUI: Garanta que o tipo da lista esteja correto
    # e que o Pydantic saiba como converter os itens da relação.
    items: List[SaleItem] = [] 

class DashboardStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_sales_today: float
    total_sales_month: float
    total_customers: int
    low_stock_count: int
    recent_sales: List[Sale]

class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: float

class PurchaseItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float

class PurchaseCreate(BaseModel):
    supplier_id: Optional[int] = None
    items: List[PurchaseItemCreate]
    discount: float = 0.0
    payment_method: Optional[str] = None
    order_number: Optional[str] = None
    invoice_number: Optional[str] = None

class Purchase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    supplier_id: Optional[int]
    total: float
    discount: float
    payment_method: Optional[str]
    order_number: Optional[str]
    invoice_number: Optional[str]
    status: str
    received_at: Optional[datetime]
    created_at: datetime
    items: List[PurchaseItem] = []

class StockMovementCreate(BaseModel):
    product_id: int
    movement_type: str
    quantity: int
    reason: Optional[str] = None

class StockMovement(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    movement_type: str
    quantity: int
    reason: Optional[str]
    user_id: Optional[int] = None
    created_at: datetime

class FinancialEntryCreate(BaseModel):
    entry_type: str
    amount: float
    category: Optional[str] = None
    description: Optional[str] = None
    account_id: Optional[int] = None
    due_date: Optional[datetime] = None
    status: str = "PENDENTE"

class FinancialEntryUpdate(BaseModel):
    entry_type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    account_id: Optional[int] = None
    due_date: Optional[datetime] = None

class FinancialEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    entry_type: str
    amount: float
    category: Optional[str]
    description: Optional[str]
    reference_id: Optional[int]
    account_id: Optional[int]
    status: str
    due_date: Optional[datetime]
    settled_at: Optional[datetime]
    created_at: datetime

class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: str
    parent_id: Optional[int] = None
    active: bool = True

class AccountUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    account_type: Optional[str] = None
    parent_id: Optional[int] = None
    active: Optional[bool] = None

class Account(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    account_type: str
    parent_id: Optional[int]
    active: bool
    created_at: datetime

class AuditLog(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int]
    action: str
    entity: str
    entity_id: Optional[int]
    old_data: Optional[str]
    new_data: Optional[str]
    timestamp: datetime

class DashboardStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_sales_today: float
    total_sales_month: float
    low_stock_products: int
    total_customers: int
    total_products: int
    recent_sales: List[Sale]

class PurchaseNeedReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    min_stock: int
    suggested_quantity: int
    average_daily_sales: float
    last_purchase_date: Optional[datetime]
    days_since_last_purchase: Optional[int]
    priority: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"

class BalanceSheetReport(BaseModel):
    ativos: float
    passivos: float
    patrimonio_liquido: float
    resultado_acumulado: float

class IncomeStatementReport(BaseModel):
    receitas: float
    despesas: float
    impostos: float
    lucro_bruto: float
    resultado_liquido: float

class ProfitabilityItem(BaseModel):
    product_id: int
    product_name: str
    sku: str
    quantity_sold: int
    revenue: float
    estimated_cost: float
    profit: float
    margin_percent: float

class ProfitabilityReport(BaseModel):
    total_revenue: float
    total_estimated_cost: float
    total_profit: float
    margin_percent: float
    items: List[ProfitabilityItem]
