from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional
from bson import ObjectId

from core.database import get_db

router = APIRouter(prefix="/api/trials", tags=["trials"])

class TrialCreate(BaseModel):
    userId: str
    serviceName: str
    endDate: date
    cancelUrl: Optional[str] = None
    renewalPrice: Optional[float] = None

class TrialUpdate(BaseModel):
    serviceName: Optional[str] = None
    endDate: Optional[date] = None
    cancelUrl: Optional[str] = None
    renewalPrice: Optional[float] = None
    status: Optional[str] = None  # detected|confirmed|canceled|expired

def to_str_id(doc):
    doc["_id"] = str(doc["_id"])
    return doc

def oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

@router.post("")
async def create_trial(payload: TrialCreate):
    db = get_db()
    doc = payload.model_dump()
    doc["status"] = "detected"
    doc["createdAt"] = datetime.utcnow()
    doc["updatedAt"] = datetime.utcnow()
    res = await db.trials.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc

@router.get("")
async def list_trials(userId: str, status: Optional[str] = None):
    db = get_db()
    q = {"userId": userId}
    if status:
        q["status"] = status
    out = []
    async for doc in db.trials.find(q).sort("endDate", 1):
        out.append(to_str_id(doc))
    return out

@router.get("/{trial_id}")
async def get_trial(trial_id: str):
    db = get_db()
    doc = await db.trials.find_one({"_id": oid(trial_id)})
    if not doc:
        raise HTTPException(404, "Trial not found")
    return to_str_id(doc)

@router.patch("/{trial_id}")
async def update_trial(trial_id: str, patch: TrialUpdate):
    db = get_db()
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates provided")
    updates["updatedAt"] = datetime.utcnow()

    res = await db.trials.update_one({"_id": oid(trial_id)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Trial not found")

    doc = await db.trials.find_one({"_id": oid(trial_id)})
    return to_str_id(doc)

@router.delete("/{trial_id}")
async def delete_trial(trial_id: str):
    db = get_db()
    res = await db.trials.delete_one({"_id": oid(trial_id)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Trial not found")
    return {"deleted": True}
