from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

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
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    min_stock: Optional[int] = None
    category: Optional[str] = None
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
    payment_method: Optional[str] = None

class Purchase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    supplier_id: Optional[int]
    total: float
    payment_method: Optional[str]
    status: str
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
    created_at: datetime

class FinancialEntryCreate(BaseModel):
    entry_type: str
    amount: float
    category: Optional[str] = None
    description: Optional[str] = None
    account_id: Optional[int] = None

class FinancialEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    entry_type: str
    amount: float
    category: Optional[str]
    description: Optional[str]
    created_at: datetime

class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: str
    parent_id: Optional[int] = None

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
