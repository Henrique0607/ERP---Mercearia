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
            # ATIVO
            Account(code="1", name="ATIVO", account_type="ATIVO"),
            Account(code="1.1", name="CIRCULANTE", account_type="ATIVO", parent_id=1),
            Account(code="1.1.1", name="Disponível", account_type="ATIVO", parent_id=2),
            Account(code="1.1.1.1", name="Caixa", account_type="ATIVO", parent_id=3),
            Account(code="1.1.1.2", name="Bancos Conta Movimento", account_type="ATIVO", parent_id=3),
            Account(code="1.1.1.2.1", name="Banco A", account_type="ATIVO", parent_id=5),
            Account(code="1.1.1.2.2", name="Banco B", account_type="ATIVO", parent_id=5),
            Account(code="1.1.2", name="Aplicações Financeiras", account_type="ATIVO", parent_id=2),
            Account(code="1.1.2.1", name="Fundos de Investimento", account_type="ATIVO", parent_id=8),
            Account(code="1.1.2.2", name="CDB", account_type="ATIVO", parent_id=8),
            Account(code="1.1.3", name="Clientes", account_type="ATIVO", parent_id=2),
            Account(code="1.1.3.1", name="Duplicatas a Receber de Clientes", account_type="ATIVO", parent_id=11),
            Account(code="1.1.3.1.1", name="Cliente A", account_type="ATIVO", parent_id=12),
            Account(code="1.1.3.1.2", name="Cliente B", account_type="ATIVO", parent_id=12),
            Account(code="1.1.3.2", name="(-) Duplicatas Descontadas", account_type="ATIVO", parent_id=11),
            Account(code="1.1.3.3", name="(-) Provisão para Devedores Duvidosos", account_type="ATIVO", parent_id=11),
            Account(code="1.1.4", name="Outros Contas a Receber", account_type="ATIVO", parent_id=2),
            Account(code="1.1.4.1", name="Empréstimos a Receber", account_type="ATIVO", parent_id=17),
            Account(code="1.1.4.2", name="Adiantamento a Funcionários", account_type="ATIVO", parent_id=17),
            Account(code="1.1.4.3", name="Impostos a Recuperar", account_type="ATIVO", parent_id=17),
            Account(code="1.1.5", name="Estoques", account_type="ATIVO", parent_id=2),
            Account(code="1.1.5.1", name="Produtos Acabados ou Mercadorias", account_type="ATIVO", parent_id=21),
            Account(code="1.1.5.2", name="Produtos em Elaboração", account_type="ATIVO", parent_id=21),
            Account(code="1.1.5.3", name="Matérias Primas", account_type="ATIVO", parent_id=21),
            Account(code="1.1.5.4", name="Material de Consumo", account_type="ATIVO", parent_id=21),
            Account(code="1.1.5.5", name="Material de Escritório", account_type="ATIVO", parent_id=21),
            Account(code="1.1.5.6", name="(-) Provisão para Perda no Estoque", account_type="ATIVO", parent_id=21),
            Account(code="1.1.6", name="Despesas Antecipadas", account_type="ATIVO", parent_id=2),
            Account(code="1.1.6.1", name="Prêmios de seguro a apropriar", account_type="ATIVO", parent_id=28),
            Account(code="1.1.6.2", name="Aluguéis", account_type="ATIVO", parent_id=28),
            Account(code="1.1.6.3", name="IPVA", account_type="ATIVO", parent_id=28),
            Account(code="1.1.6.4", name="Assinatura de Jornais e Revistas", account_type="ATIVO", parent_id=28),
            Account(code="1.2", name="NÃO CIRCULANTE", account_type="ATIVO", parent_id=1),
            Account(code="1.2.1", name="REALIZÁVEL A LONGO PRAZO", account_type="ATIVO", parent_id=33),
            Account(code="1.2.1.1", name="Clientes", account_type="ATIVO", parent_id=34),
            Account(code="1.2.1.2", name="Contas a Receber", account_type="ATIVO", parent_id=34),
            Account(code="1.2.1.3", name="Despesas Antecipadas", account_type="ATIVO", parent_id=34),
            Account(code="1.2.1.4", name="Depósitos Judiciais", account_type="ATIVO", parent_id=34),
            Account(code="1.2.1.5", name="Empréstimo a Sócios / Acionistas", account_type="ATIVO", parent_id=34),
            Account(code="1.2.1.6", name="Empréstimos a Empresas Controladas/Coligadas", account_type="ATIVO", parent_id=34),
            Account(code="1.2.2", name="INVESTIMENTOS", account_type="ATIVO", parent_id=33),
            Account(code="1.2.2.1", name="Participações em Controladas/Coligadas", account_type="ATIVO", parent_id=41),
            Account(code="1.2.2.2", name="Participações em Outras Empresas", account_type="ATIVO", parent_id=41),
            Account(code="1.2.2.3", name="Outros Investimentos", account_type="ATIVO", parent_id=41),
            Account(code="1.2.2.4", name="(-) Provisão para Perda em Investimento", account_type="ATIVO", parent_id=41),
            Account(code="1.2.3", name="IMOBILIZADO", account_type="ATIVO", parent_id=33),
            Account(code="1.2.3.1", name="Terrenos", account_type="ATIVO", parent_id=46),
            Account(code="1.2.3.2", name="Imóveis", account_type="ATIVO", parent_id=46),
            Account(code="1.2.3.3", name="Instalações", account_type="ATIVO", parent_id=46),
            Account(code="1.2.3.4", name="Máquinas e equipamentos", account_type="ATIVO", parent_id=46),
            Account(code="1.2.3.5", name="Móveis e Utensílios", account_type="ATIVO", parent_id=46),
            Account(code="1.2.3.6", name="Veículos", account_type="ATIVO", parent_id=46),
            Account(code="1.2.3.7", name="Marcas e Patentes", account_type="ATIVO", parent_id=46),
            Account(code="1.2.3.8", name="(-) Depreciações Acumuladas", account_type="ATIVO", parent_id=46),
            Account(code="1.2.3.8.1", name="Imóveis", account_type="ATIVO", parent_id=54),
            Account(code="1.2.3.8.2", name="Instalações", account_type="ATIVO", parent_id=54),
            Account(code="1.2.3.8.3", name="Máquinas e equipamentos", account_type="ATIVO", parent_id=54),
            Account(code="1.2.3.8.4", name="Móveis e Utensílios", account_type="ATIVO", parent_id=54),
            Account(code="1.2.3.8.5", name="Veículos", account_type="ATIVO", parent_id=54),
            Account(code="1.2.4", name="INTANGÍVEL", account_type="ATIVO", parent_id=33),
            Account(code="1.2.4.1", name="Fundo de Comércio Adquirido", account_type="ATIVO", parent_id=60),
            Account(code="1.2.4.2", name="Bens Incorpóreos", account_type="ATIVO", parent_id=60),
            Account(code="1.2.4.3", name="(-) Amortização Acumulada", account_type="ATIVO", parent_id=60),
            # PASSIVO
            Account(code="2", name="PASSIVO", account_type="PASSIVO"),
            Account(code="2.1", name="CIRCULANTE", account_type="PASSIVO", parent_id=63),
            Account(code="2.1.1", name="Fornecedores", account_type="PASSIVO", parent_id=64),
            Account(code="2.1.1.1", name="Fornecedor A", account_type="PASSIVO", parent_id=65),
            Account(code="2.1.1.2", name="Fornecedor B", account_type="PASSIVO", parent_id=65),
            Account(code="2.1.2", name="Contas a Pagar", account_type="PASSIVO", parent_id=64),
            Account(code="2.1.2.1", name="Água", account_type="PASSIVO", parent_id=68),
            Account(code="2.1.2.2", name="Luz", account_type="PASSIVO", parent_id=68),
            Account(code="2.1.2.3", name="Telefone", account_type="PASSIVO", parent_id=68),
            Account(code="2.1.2.4", name="Aluguel", account_type="PASSIVO", parent_id=68),
            Account(code="2.1.3", name="Empréstimos e Financiamentos", account_type="PASSIVO", parent_id=64),
            Account(code="2.1.4", name="Salários a Pagar", account_type="PASSIVO", parent_id=64),
            Account(code="2.1.5", name="Impostos a Pagar", account_type="PASSIVO", parent_id=64),
            Account(code="2.1.6", name="Provisões", account_type="PASSIVO", parent_id=64),
            Account(code="2.1.6.1", name="Provisão para Férias", account_type="PASSIVO", parent_id=74),
            Account(code="2.1.6.2", name="Provisão para 13º Salário", account_type="PASSIVO", parent_id=74),
            Account(code="2.1.7", name="Dividendos a Pagar", account_type="PASSIVO", parent_id=64),
            Account(code="2.2", name="NÃO CIRCULANTE", account_type="PASSIVO", parent_id=63),
            Account(code="2.2.1", name="EXIGÍVEL A LONGO PRAZO", account_type="PASSIVO", parent_id=78),
            Account(code="2.2.1.1", name="Fornecedores", account_type="PASSIVO", parent_id=79),
            Account(code="2.2.1.2", name="Contas a Pagar", account_type="PASSIVO", parent_id=79),
            Account(code="2.2.1.3", name="Empréstimos e Financiamentos", account_type="PASSIVO", parent_id=79),
            Account(code="2.2.1.4", name="Obrigações Fiscais", account_type="PASSIVO", parent_id=79),
            Account(code="2.2.1.5", name="Empréstimos de Empresas Controladas/Coligadas", account_type="PASSIVO", parent_id=79),
            Account(code="2.3", name="PATRIMÔNIO LÍQUIDO", account_type="PATRIMONIO_LIQUIDO", parent_id=63),
            Account(code="2.3.1", name="Capital Social", account_type="PATRIMONIO_LIQUIDO", parent_id=85),
            Account(code="2.3.1.1", name="Capital Subscrito", account_type="PATRIMONIO_LIQUIDO", parent_id=86),
            Account(code="2.3.1.2", name="(-) Capital a Integralizar", account_type="PATRIMONIO_LIQUIDO", parent_id=86),
            Account(code="2.3.2", name="Reservas", account_type="PATRIMONIO_LIQUIDO", parent_id=85),
            Account(code="2.3.2.1", name="De Capital", account_type="PATRIMONIO_LIQUIDO", parent_id=89),
            Account(code="2.3.2.2", name="De Reavaliação", account_type="PATRIMONIO_LIQUIDO", parent_id=89),
            Account(code="2.3.2.3", name="Legal", account_type="PATRIMONIO_LIQUIDO", parent_id=89),
            Account(code="2.3.2.4", name="Estatutária", account_type="PATRIMONIO_LIQUIDO", parent_id=89),
            Account(code="2.3.2.5", name="Para Contingências", account_type="PATRIMONIO_LIQUIDO", parent_id=89),
            Account(code="2.3.3", name="Ajustes de Avaliação Patrimonial", account_type="PATRIMONIO_LIQUIDO", parent_id=85),
            Account(code="2.3.4", name="Prejuízos Acumulados", account_type="PATRIMONIO_LIQUIDO", parent_id=85),
            Account(code="2.3.4.1", name="Prejuízos Exercícios Anteriores", account_type="PATRIMONIO_LIQUIDO", parent_id=95),
            Account(code="2.3.4.2", name="Prejuízos Exercício Corrente", account_type="PATRIMONIO_LIQUIDO", parent_id=95),
            # CONTAS DE RESULTADO
            Account(code="3", name="CONTAS DE RESULTADO", account_type="RECEITA"),
            Account(code="3.1", name="RECEITA BRUTA DE VENDAS E SERVIÇOS", account_type="RECEITA", parent_id=97),
            Account(code="3.1.1", name="Receita Filial MG", account_type="RECEITA", parent_id=98),
            Account(code="3.1.2", name="Receita Filial SP", account_type="RECEITA", parent_id=98),
            Account(code="3.1.3", name="Receita Filial RJ", account_type="RECEITA", parent_id=98),
            Account(code="3.2", name="VENDAS CANCELADAS", account_type="DESPESA", parent_id=97),
            Account(code="3.2.1", name="Filial MG", account_type="DESPESA", parent_id=102),
            Account(code="3.2.2", name="Filial SP", account_type="DESPESA", parent_id=102),
            Account(code="3.2.3", name="Filial RJ", account_type="DESPESA", parent_id=102),
            Account(code="3.3", name="IMPOSTOS SOBRE VENDAS E SERVIÇOS", account_type="DESPESA", parent_id=97),
            Account(code="3.3.1", name="Filial MG", account_type="DESPESA", parent_id=106),
            Account(code="3.3.2", name="Filial SP", account_type="DESPESA", parent_id=106),
            Account(code="3.3.3", name="Filial RJ", account_type="DESPESA", parent_id=106),
            Account(code="3.4", name="CUSTO DA MERCADORIA/PRODUTO E SERVIÇOS PRESTADOS", account_type="DESPESA", parent_id=97),
            Account(code="3.4.1", name="Custo Filial MG", account_type="DESPESA", parent_id=110),
            Account(code="3.4.2", name="Custo Filial SP", account_type="DESPESA", parent_id=110),
            Account(code="3.4.3", name="Custo Filial RJ", account_type="DESPESA", parent_id=110),
            Account(code="3.5", name="DESPESAS OPERACIONAIS", account_type="DESPESA", parent_id=97),
            Account(code="3.5.1", name="Despesas Operacionais - MG", account_type="DESPESA", parent_id=115),
            Account(code="3.5.1.1", name="Despesas com Vendas", account_type="DESPESA", parent_id=116),
            Account(code="3.5.1.2", name="Despesas Gerais e Administrativas", account_type="DESPESA", parent_id=116),
            Account(code="3.5.1.3", name="Encargos Financeiros Líquidos", account_type="DESPESA", parent_id=116),
            Account(code="3.5.1.4", name="Outras Receitas e Despesas Operacionais", account_type="DESPESA", parent_id=116),
            Account(code="3.5.2", name="Despesas Operacionais - SP", account_type="DESPESA", parent_id=115),
            Account(code="3.5.2.1", name="Despesas com Vendas", account_type="DESPESA", parent_id=121),
            Account(code="3.5.2.2", name="Despesas Gerais e Administrativas", account_type="DESPESA", parent_id=121),
            Account(code="3.5.2.3", name="Encargos Financeiros Líquidos", account_type="DESPESA", parent_id=121),
            Account(code="3.5.2.4", name="Outras Receitas e Despesas Operacionais", account_type="DESPESA", parent_id=121),
            Account(code="3.5.3", name="Despesas Operacionais - RJ", account_type="DESPESA", parent_id=115),
            Account(code="3.5.3.1", name="Despesas com Vendas", account_type="DESPESA", parent_id=126),
            Account(code="3.5.3.2", name="Despesas Gerais e Administrativas", account_type="DESPESA", parent_id=126),
            Account(code="3.5.3.3", name="Encargos Financeiros Líquidos", account_type="DESPESA", parent_id=126),
            Account(code="3.5.3.4", name="Outras Receitas e Despesas Operacionais", account_type="DESPESA", parent_id=126),
            Account(code="3.5.4", name="Despesas Operacionais - Sede", account_type="DESPESA", parent_id=115),
            Account(code="3.5.4.1", name="Despesas com Vendas", account_type="DESPESA", parent_id=131),
            Account(code="3.5.4.2", name="Despesas Gerais e Administrativas", account_type="DESPESA", parent_id=131),
            Account(code="3.5.4.3", name="Encargos Financeiros Líquidos", account_type="DESPESA", parent_id=131),
            Account(code="3.5.4.4", name="Outras Receitas e Despesas Operacionais", account_type="DESPESA", parent_id=131),
            Account(code="3.5.4.5", name="Resultado de Equivalência Patrimonial", account_type="DESPESA", parent_id=131),
            Account(code="3.5.4.5.1", name="Resultado da Investida A", account_type="DESPESA", parent_id=137),
            Account(code="3.5.4.5.2", name="Resultado da Investida B", account_type="DESPESA", parent_id=137),
            Account(code="3.6", name="OUTRAS RECEITAS OU DESPESAS", account_type="DESPESA", parent_id=97),
            Account(code="3.6.1", name="Filial MG", account_type="DESPESA", parent_id=140),
            Account(code="3.6.1.1", name="Receita de Vendas de Bens do Ativo Não Circulante", account_type="RECEITA", parent_id=141),
            Account(code="3.6.1.2", name="Baixa de Bens do Ativo Não Circulante", account_type="DESPESA", parent_id=141),
            Account(code="3.6.2", name="Filial SP", account_type="DESPESA", parent_id=140),
            Account(code="3.6.2.1", name="Receita de Vendas de Bens do Ativo Não Circulante", account_type="RECEITA", parent_id=144),
            Account(code="3.6.2.2", name="Baixa de Bens Imobilizados", account_type="DESPESA", parent_id=144),
            Account(code="3.6.3", name="Filial RJ", account_type="DESPESA", parent_id=140),
            Account(code="3.6.3.1", name="Receita de Vendas de Bens do Ativo Não Circulante", account_type="RECEITA", parent_id=147),
            Account(code="3.6.3.2", name="Baixa de Bens do Ativo Não Circulante", account_type="DESPESA", parent_id=147),
            Account(code="3.6.4", name="Sede", account_type="DESPESA", parent_id=140),
            Account(code="3.6.4.1", name="Receita de Vendas de Bens do Ativo Não Circulante", account_type="RECEITA", parent_id=150),
            Account(code="3.6.4.2", name="Baixa de Bens do Ativo Não Circulante", account_type="DESPESA", parent_id=150),
            Account(code="3.6.4.3", name="Perda em Investimento", account_type="DESPESA", parent_id=150),
            Account(code="3.7", name="PROVISÃO PARA IMPOSTO DE RENDA E CSLL", account_type="DESPESA", parent_id=97),
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
