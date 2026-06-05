from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import router, current_user_id
import os
from dotenv import load_dotenv
from pathlib import Path
import logging
from sqlalchemy import text
from passlib.hash import pbkdf2_sha256

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="ERP Mercearia")

cors_origins = os.getenv("CORS_ORIGINS", "")
origins = [
    origin.strip()
    for origin in cors_origins.split(",")
    if origin.strip() and origin.strip() != "*"
]

if not origins:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.middleware("http")
async def attach_current_user(request, call_next):
    raw_user_id = request.headers.get("X-User-Id")
    token = None
    if raw_user_id:
        try:
            token = current_user_id.set(int(raw_user_id))
        except ValueError:
            token = current_user_id.set(None)
    try:
        return await call_next(request)
    finally:
        if token is not None:
            current_user_id.reset(token)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE"))
        await conn.execute(text("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS discount DOUBLE PRECISION DEFAULT 0"))
        await conn.execute(text("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS order_number VARCHAR"))
        await conn.execute(text("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS invoice_number VARCHAR"))
        await conn.execute(text("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE"))
        await conn.execute(text("ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_id INTEGER"))
        await conn.execute(text("ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'PENDENTE'"))
        await conn.execute(text("ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE"))
        await conn.execute(text("ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE"))
        await conn.execute(text("UPDATE financial_entries SET status = 'PENDENTE' WHERE status IS NULL"))
        user_count = (await conn.execute(text("SELECT COUNT(*) FROM users"))).scalar() or 0
        if user_count == 0:
            await conn.execute(
                text("""
                    INSERT INTO users (name, email, password, role, active, created_at)
                    VALUES (:name, :email, :password, :role, true, NOW())
                """),
                {
                    "name": "Administrador",
                    "email": "admin@erp.com",
                    "password": pbkdf2_sha256.hash("admin123"),
                    "role": "ADMIN",
                },
            )
    logger.info("Database tables created")

@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
    logger.info("Database connection closed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
