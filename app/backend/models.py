from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    GERENTE = "GERENTE"
    VENDEDOR = "VENDEDOR"
    COMPRADOR = "COMPRADOR"
    FINANCEIRO = "FINANCEIRO"
    ATENDENTE = "ATENDENTE"
    AUDITOR = "AUDITOR"
    TI = "TI"

class AuditAction(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.VENDEDOR)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False, index=True)
    cost_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=10)
    category = Column(String, nullable=True)
    unit = Column(String, default="UN")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    stock_movements = relationship("StockMovement", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")
    purchase_items = relationship("PurchaseItem", back_populates="product")

    @property
    def profit_margin(self):
        """Calcula a margem de lucro em porcentagem: ((preço_venda - custo) / preço_venda) * 100"""
        if self.sale_price == 0:
            return 0.0
        return ((self.sale_price - self.cost_price) / self.sale_price) * 100

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    phone = Column(String, nullable=True)
    cpf_cnpj = Column(String, unique=True, nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    sales = relationship("Sale", back_populates="customer")

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    phone = Column(String, nullable=True)
    cnpj = Column(String, unique=True, nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    purchases = relationship("Purchase", back_populates="supplier")

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    total = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    payment_method = Column(String, nullable=True)
    status = Column(String, default="COMPLETED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan", lazy="selectin")

class SaleItem(Base):
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

class Purchase(Base):
    __tablename__ = "purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    total = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    payment_method = Column(String, nullable=True)
    order_number = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    status = Column(String, default="RECEIVED")
    received_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan", lazy="selectin")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    
    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product", back_populates="purchase_items")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    movement_type = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    product = relationship("Product", back_populates="stock_movements")

class FinancialEntry(Base):
    __tablename__ = "financial_entries"

    id = Column(Integer, primary_key=True, index=True)

    entry_type = Column(String, nullable=False)

    amount = Column(Float, nullable=False)

    category = Column(String, nullable=True)

    description = Column(Text, nullable=True)

    reference_id = Column(Integer, nullable=True)

    account_id = Column(
        Integer,
        ForeignKey("accounts.id"),
        nullable=True
    )

    status = Column(String, default="PENDENTE")

    due_date = Column(DateTime(timezone=True), nullable=True)

    settled_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    account = relationship("Account", back_populates="entries")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    account_type = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    parent = relationship("Account", remote_side=[id], backref="children")
    entries = relationship("FinancialEntry", back_populates="account")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    action = Column(SQLEnum(AuditAction), nullable=False)
    entity = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)
    old_data = Column(Text, nullable=True)
    new_data = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
