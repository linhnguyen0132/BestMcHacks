# services/email_monitor/scanner.py
from __future__ import annotations
import asyncio
from datetime import datetime, timezone, date
from typing import Dict, Any, List, Optional
from googleapiclient.errors import HttpError

from core.database import get_db
from services.email_monitor.gmail_client import build_gmail_service_from_user
from services.email_monitor.detector import is_trial_candidate
from services.email_monitor.queries import TRIAL_QUERY_V1


def _headers(payload: Dict[str, Any]) -> Dict[str, str]:
    out = {}
    for h in (payload or {}).get("headers", []):
        if h.get("name") and h.get("value"):
            out[h["name"]] = h["value"]
    return out

async def _list_messages(gmail, q: str, max_results: int) -> List[Dict[str, str]]:
    def _call():
        return gmail.users().messages().list(userId="me", q=q, maxResults=max_results).execute()
    resp = await asyncio.to_thread(_call)
    return resp.get("messages", [])

async def _get_message_metadata(gmail, message_id: str) -> Dict[str, Any]:
    def _call():
        return gmail.users().messages().get(
            userId="me",
            id=message_id,
            format="metadata",
            metadataHeaders=["From", "Subject", "Date"]
        ).execute()
    return await asyncio.to_thread(_call)

def _internal_date_int(msg: Dict[str, Any]) -> int:
    try:
        return int(msg.get("internalDate", "0"))
    except Exception:
        return 0

def _end_date_guess_from_internaldate(internal_date_ms: int) -> date:
    # V1 : on n'extrait pas la vraie endDate → on met “dans 7 jours” par défaut
    # (tu pourras remplacer par un vrai parser ensuite)
    dt = datetime.fromtimestamp(internal_date_ms / 1000, tz=timezone.utc)
    return (dt.date())

async def scan_gmail_for_user(user: dict, *, max_results: int = 50) -> int:
    """
    Scan Gmail for a single user and create trials in MongoDB.
    Returns number of newly created trials.
    """
    db = get_db()

    gmail = build_gmail_service_from_user(user)

    last_seen = (user.get("gmail") or {}).get("lastSeenInternalDate", 0)
    newest_seen = last_seen

    messages = await _list_messages(gmail, TRIAL_QUERY_V1, max_results=max_results)
    if not messages:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"gmail.lastScanAt": datetime.now(timezone.utc)}}
        )
        return 0

    created = 0

    for m in messages:
        mid = m["id"]
        meta = await _get_message_metadata(gmail, mid)

        internal_date = _internal_date_int(meta)
        if internal_date <= last_seen:
            continue
        newest_seen = max(newest_seen, internal_date)

        hdr = _headers(meta.get("payload", {}))
        subject = hdr.get("Subject", "")
        sender = hdr.get("From", "")
        snippet = meta.get("snippet", "")

        if not is_trial_candidate(subject, sender, snippet):
            continue

        # --- V1: create a trial with minimal info ---
        # You can later replace this with parser extraction.
        doc = {
            "userId": str(user["_id"]),
            "serviceName": subject[:80] or "Unknown service",
            "endDate": datetime.combine(_end_date_guess_from_internaldate(internal_date), datetime.min.time()).replace(tzinfo=timezone.utc),
            "cancelUrl": None,
            "renewalPrice": None,
            "status": "detected",
            "source": "gmail",
            "links": {"gmailMessageId": mid},
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }

        # Upsert on (userId + gmailMessageId) to prevent duplicates
        res = await db.trials.update_one(
            {"userId": str(user["_id"]), "links.gmailMessageId": mid},
            {"$setOnInsert": doc},
            upsert=True
        )
        if res.upserted_id:
            created += 1

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "gmail.lastSeenInternalDate": newest_seen,
            "gmail.lastScanAt": datetime.now(timezone.utc),
        }}
    )

    return created

async def scan_all_users(*, max_results_per_user: int = 50) -> Dict[str, int]:
    db = get_db()

    # users who have Google tokens
    cursor = db.users.find({
        "provider": "google",
        "googleTokens.refreshToken": {"$exists": True, "$ne": None}
    })

    users = 0
    created = 0
    failed = 0

    async for user in cursor:
        users += 1
        try:
            created += await scan_gmail_for_user(user, max_results=max_results_per_user)
        except HttpError:
            failed += 1
        except Exception:
            failed += 1

    return {"users": users, "created": created, "failed": failed}
