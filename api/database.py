import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = (
    f"postgresql+asyncpg://"
    f"{os.getenv('DATA_DB_USER', 'odds')}:"
    f"{os.getenv('DATA_DB_PASSWORD', 'odds_password')}@"
    f"{os.getenv('DATA_DB_HOST', 'localhost')}:"
    f"{os.getenv('DATA_DB_PORT', '5433')}/"
    f"{os.getenv('DATA_DB_NAME', 'odds_db')}"
)

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
