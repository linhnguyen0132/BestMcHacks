from fastapi import FastAPI

from contextlib import asynccontextmanager
from core.database import init_db, close_db
from routes.trials import router as trials_router
from routes.health import router as health_router

app = FastAPI(title="FreeFromTrial API", version="0.1.0")

# ✅ Routes de base (au cas où)
@app.get("/")
async def root():
    return {"name": "FreeFromTrial API", "status": "running"}

# ✅ Enregistre tes routes
app.include_router(health_router)
app.include_router(trials_router)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    close_db()

app = FastAPI(title="FreeFromTrial API", version="0.1.0", lifespan=lifespan)

app.include_router(health_router)
app.include_router(trials_router)

@app.get("/")
async def root():
    return {"status": "running"}