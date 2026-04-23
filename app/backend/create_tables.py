import asyncio
from database import engine, Base
import models

async def create_all_tables():
    print("Criando tabelas no PostgreSQL...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Todas as tabelas foram criadas com sucesso!")

if __name__ == "__main__":
    asyncio.run(create_all_tables())