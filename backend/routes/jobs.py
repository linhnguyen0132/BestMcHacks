# routes/jobs.py
from fastapi import APIRouter, HTTPException, Header
import os

from services.email_monitor.scanner import scan_all_users

router = APIRouter(prefix="/jobs", tags=["jobs"])

CRON_SECRET = os.environ.get("CRON_SECRET")

@router.post("/scan-gmail")
async def job_scan_gmail(x_cron_secret: str = Header(default=None)):
    # Simple protection
    if CRON_SECRET and x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    stats = await scan_all_users(max_results_per_user=50)
    return {"ok": True, "stats": stats}
