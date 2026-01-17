from motor.motor_asyncio import AsyncIOMotorClient
from core.config import MONGODB_URI, DB_NAME

_client: AsyncIOMotorClient | None = None
_db = None

async def init_db():
    global _client, _db
    _client = AsyncIOMotorClient(MONGODB_URI)
    _db = _client[DB_NAME]
    # Ping + indexes de base
    await _db.command("ping")
    await _db.trials.create_index([("userId", 1), ("status", 1)])
    await _db.trials.create_index([("userId", 1), ("endDate", 1)])
    await _db.trials.create_index(
        [("userId", 1), ("serviceName", 1), ("endDate", 1)],
        unique=True
        )


def get_db():
    if _db is None:
        raise RuntimeError("DB not initialized")
    return _db

def close_db():
    global _client
    if _client is not None:
        _client.close()
