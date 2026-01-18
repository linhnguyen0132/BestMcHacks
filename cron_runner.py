# jobs/cron_runner.py
import asyncio
from services.email_monitor.scanner import scan_all_users
from core.database import init_db, close_db

async def main():
    await init_db()
    stats = await scan_all_users(max_results_per_user=50)
    print("SCAN DONE:", stats)
    close_db()

if __name__ == "__main__":
    asyncio.run(main())
