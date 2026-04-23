import asyncio
from database import AsyncSessionLocal, engine, Base
from models import Product, Customer, Supplier, Account, FinancialEntry
from datetime import datetime, timezone

async def seed_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        produtos = [
            Product(name="Arroz Branco 5kg", sku="ARR001", cost_price=15.50, sale_price=22.90, stock=50, min_stock=10, category="Cereais", unit="UN"),
            Product(name="Feijão Preto 1kg", sku="FEJ001", cost_price=5.30, sale_price=8.50, stock=80, min_stock=15, category="Cereais", unit="UN"),
            Product(name="Açúcar Cristal 1kg", sku="ACU001", cost_price=3.20, sale_price=5.50, stock=100, min_stock=20, category="Açúcares", unit="UN"),
            Product(name="Óleo de Soja 900ml", sku="OLE001", cost_price=6.80, sale_price=10.90, stock=60, min_stock=12, category="Óleos", unit="UN"),
            Product(name="Café Torrado 500g", sku="CAF001", cost_price=12.00, sale_price=18.90, stock=40, min_stock=8, category="Bebidas", unit="UN"),
            Product(name="Leite Integral 1L", sku="LEI001", cost_price=3.50, sale_price=5.90, stock=5, min_stock=15, category="Laticínios", unit="UN"),
            Product(name="Macarrão Espaguete 500g", sku="MAC001", cost_price=2.80, sale_price=4.90, stock=120, min_stock=25, category="Massas", unit="UN"),
            Product(name="Sal Refinado 1kg", sku="SAL001", cost_price=1.20, sale_price=2.50, stock=90, min_stock=15, category="Temperos", unit="UN"),
            Product(name="Farinha de Trigo 1kg", sku="FAR001", cost_price=3.50, sale_price=6.20, stock=70, min_stock=15, category="Farinhas", unit="UN"),
            Product(name="Biscoito Cream Cracker", sku="BIS001", cost_price=2.50, sale_price=4.50, stock=3, min_stock=10, category="Biscoitos", unit="UN"),
        ]
        
        clientes = [
            Customer(name="Maria Silva", email="maria.silva@email.com", phone="(11) 98765-4321", cpf_cnpj="123.456.789-00", address="Rua das Flores, 123"),
            Customer(name="João Santos", email="joao.santos@email.com", phone="(11) 97654-3210", cpf_cnpj="987.654.321-00", address="Av. Principal, 456"),
            Customer(name="Ana Oliveira", email="ana.oliveira@email.com", phone="(11) 96543-2109", cpf_cnpj="456.789.123-00", address="Rua do Comércio, 789"),
            Customer(name="Carlos Pereira", phone="(11) 95432-1098", cpf_cnpj="789.123.456-00", address="Praça Central, 101"),
            Customer(name="Fernanda Costa", email="fernanda@email.com", phone="(11) 94321-0987"),
        ]
        
        fornecedores = [
            Supplier(name="Distribuidora Alimentos Ltda", email="vendas@distribuidora.com", phone="(11) 3333-4444", cnpj="12.345.678/0001-90", address="Rua Industrial, 1000"),
            Supplier(name="Atacadão do Bairro", email="compras@atacadao.com", phone="(11) 3333-5555", cnpj="98.765.432/0001-10", address="Av. dos Atacadistas, 2000"),
            Supplier(name="Central de Bebidas", email="contato@centralbebidas.com", phone="(11) 3333-6666", cnpj="45.678.912/0001-30"),
        ]
        
        contas = [
            Account(code="1", name="ATIVO", account_type="ATIVO"),
            Account(code="1.1", name="Ativo Circulante", account_type="ATIVO", parent_id=1),
            Account(code="1.1.1", name="Caixa", account_type="ATIVO", parent_id=2),
            Account(code="1.1.2", name="Bancos", account_type="ATIVO", parent_id=2),
            Account(code="2", name="PASSIVO", account_type="PASSIVO"),
            Account(code="2.1", name="Passivo Circulante", account_type="PASSIVO", parent_id=5),
            Account(code="3", name="RECEITAS", account_type="RECEITA"),
            Account(code="3.1", name="Receitas de Vendas", account_type="RECEITA", parent_id=7),
            Account(code="4", name="DESPESAS", account_type="DESPESA"),
            Account(code="4.1", name="Despesas Operacionais", account_type="DESPESA", parent_id=9),
        ]
        
        for produto in produtos:
            session.add(produto)
        for cliente in clientes:
            session.add(cliente)
        for fornecedor in fornecedores:
            session.add(fornecedor)
        for conta in contas:
            session.add(conta)
        
        await session.commit()
        print("✓ Database seeded successfully!")
        print(f"  - {len(produtos)} produtos criados")
        print(f"  - {len(clientes)} clientes criados")
        print(f"  - {len(fornecedores)} fornecedores criados")
        print(f"  - {len(contas)} contas contábeis criadas")

if __name__ == "__main__":
    asyncio.run(seed_database())
