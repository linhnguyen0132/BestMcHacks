import os
from fastapi import FastAPI
from contextlib import asynccontextmanager
from core.database import init_db, close_db
from routes.health import router as health_router
from routes.trials import router as trials_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    close_db()

app = FastAPI(title="FreeFromTrial API", lifespan=lifespan)

# Pour DO App Platform, le run command utilise uvicorn app:app,
# donc pas besoin de __main__.
