from fastapi import APIRouter, Request, HTTPException, Header
from datetime import datetime, timezone, date, time
from typing import Optional
from pydantic import BaseModel
from bson import ObjectId
import os

from core.database import get_db

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

GUMLOOP_SHARED_SECRET = os.environ["GUMLOOP_SHARED_SECRET"]

class GumloopTrial(BaseModel):
    userId: str                 # ou email si tu préfères
    serviceName: str
    endDate: date
    cancelUrl: Optional[str] = None
    renewalPrice: Optional[float] = None
    source: str = "gumloop"
    candidateId: Optional[str] = None
    gmailMessageId: Optional[str] = None

def date_to_datetime_utc(d: date) -> datetime:
    return datetime.combine(d, time.min).replace(tzinfo=timezone.utc)

@router.post("/gumloop/trial")
async def gumloop_create_trial(
    payload: GumloopTrial,
    x_shared_secret: str = Header(default=None),
):
    # 🔒 simple auth
    if x_shared_secret != GUMLOOP_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db = get_db()

    doc = payload.model_dump()
    # normalize
    doc["userId"] = payload.userId
    doc["endDate"] = date_to_datetime_utc(payload.endDate)
    now = datetime.now(timezone.utc)
    doc["status"] = "detected"
    doc["createdAt"] = now
    doc["updatedAt"] = now

    res = await db.trials.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc