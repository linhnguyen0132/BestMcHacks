from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional
from bson import ObjectId
from datetime import datetime, date, time, timezone, timedelta

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

def date_to_datetime_utc(d: date) -> datetime:
    # Stocke à minuit UTC (tu peux changer si tu veux l’heure locale)
    return datetime.combine(d, time.min).replace(tzinfo=timezone.utc)

def oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

from pymongo.errors import DuplicateKeyError

@router.post("")
async def create_trial(payload: TrialCreate):
    db = get_db()
    doc = payload.model_dump()
    doc["endDate"] = date_to_datetime_utc(doc["endDate"])
    doc["status"] = "detected"
    doc["createdAt"] = datetime.now(timezone.utc)
    doc["updatedAt"] = datetime.now(timezone.utc)

    try:
        res = await db.trials.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc
    except DuplicateKeyError:
        # retourne le doc existant (au lieu de crash)
        existing = await db.trials.find_one({
            "userId": doc["userId"],
            "serviceName": doc["serviceName"],
            "endDate": doc["endDate"]
        })
        existing["_id"] = str(existing["_id"])
        return existing


@router.get("")
async def list_trials(userId: str, status: Optional[str] = None, days: Optional[int] = None):
    db = get_db()
    q = {"userId": userId}

    if status:
        q["status"] = status
    else:
        q["status"] = {"$nin": ["canceled", "expired"]}

    now = datetime.now(timezone.utc)

    if days is not None:
        if days < 0 or days > 365:
            raise HTTPException(400, "days must be between 0 and 365")
        until = now + timedelta(days=days)
        q["endDate"] = {"$gte": now, "$lte": until}

    out = []
    async for doc in db.trials.find(q).sort("endDate", 1):
        doc["_id"] = str(doc["_id"])

        end_date = doc["endDate"]
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        delta = end_date - now
        doc["daysLeft"] = max(0, int((delta.total_seconds() + 86399) // 86400))

        out.append(doc)

    return out

@router.get("/upcoming")
async def upcoming_reminders(
    userId: str,
    days: str = "5,3,1",
    include_today: bool = False,
    include_canceled: bool = False,
):
    """
    Retourne les trials à notifier à J-5/J-3/J-1 (et optionnellement J-0).
    Paramètre days: "5,3,1" (CSV)
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    # Parse "5,3,1" -> [5,3,1]
    try:
        targets = [int(x.strip()) for x in days.split(",") if x.strip() != ""]
        if include_today and 0 not in targets:
            targets.append(0)
        # Nettoyage
        targets = sorted(set(targets))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid days. Use CSV like '5,3,1'")

    if any(d < 0 or d > 365 for d in targets):
        raise HTTPException(status_code=400, detail="days values must be between 0 and 365")

    # On ne récupère que dans la fenêtre utile [now, now + max_target]
    max_days = max(targets) if targets else 0
    until = now + timedelta(days=max_days)

    q = {
        "userId": userId,
        "endDate": {"$gte": now, "$lte": until},
    }

    if not include_canceled:
        q["status"] = {"$nin": ["canceled", "expired"]}

    out = []
    async for doc in db.trials.find(q).sort("endDate", 1):
        doc["_id"] = str(doc["_id"])

        end_date = doc["endDate"]
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        delta = end_date - now
        days_left = max(0, int((delta.total_seconds() + 86399) // 86400))  # ceil en jours

        if days_left in targets:
            out.append({
                "trialId": doc["_id"],
                "userId": doc["userId"],
                "serviceName": doc.get("serviceName"),
                "endDate": end_date.isoformat(),
                "daysLeft": days_left,
                "cancelUrl": doc.get("cancelUrl"),
                "renewalPrice": doc.get("renewalPrice"),
                "status": doc.get("status", "detected"),
            })

    return {
        "userId": userId,
        "targets": targets,
        "count": len(out),
        "reminders": out
    }


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

    if "endDate" in updates:
        updates["endDate"] = date_to_datetime_utc(updates["endDate"])

    updates["updatedAt"] = datetime.now(timezone.utc)
    
    # Perform update
    res = await db.trials.update_one(
        {"_id": oid(trial_id)},
        {"$set": updates}
    )
    
    if res.matched_count == 0:
        raise HTTPException(404, "Trial not found")
    
    # Return updated document
    updated = await db.trials.find_one({"_id": oid(trial_id)})
    return to_str_id(updated)

@router.delete("/{trial_id}")
async def delete_trial(trial_id: str):
    db = get_db()
    res = await db.trials.delete_one({"_id": oid(trial_id)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Trial not found")
    return {"deleted": True}
