from fastapi import APIRouter
from core.database import get_db

router = APIRouter(tags=["health"])

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.get("/health/db")
async def health_db():
    db = get_db()
    await db.command("ping")
    return {"mongo": "connected"}
