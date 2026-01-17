import os
from fastapi import FastAPI
from core.database import init_db, close_db
from routes.health import router as health_router
from routes.trials import router as trials_router



app = FastAPI(title="TrialGuard API")

app.include_router(health_router)
app.include_router(trials_router)

@app.on_event("startup")
async def startup():
    await init_db()

@app.on_event("shutdown")
def shutdown():
    close_db()

# Pour DO App Platform, le run command utilise uvicorn app:app,
# donc pas besoin de __main__.
