import pytest
from sqlalchemy.ext.asyncio import AsyncSession


async def test_get_db_yields_session(db):
    assert isinstance(db, AsyncSession)
