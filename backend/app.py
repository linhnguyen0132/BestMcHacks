from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
import os

from core.database import init_db, close_db
from routes.health import router as health_router
from routes.trials import router as trials_router
from routes.oauth import router as oauth_router
from routes.auth import router as auth_router
from routes.webhooks import router as webhooks_router
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    print("🚀 Starting FreeFromTrial API...")
    await init_db()
    print("✅ Database connected and indexed")
    yield
    print("🛑 Shutting down...")
    close_db()
    print("✅ Database connection closed")

# Create FastAPI app
app = FastAPI(
    title="FreeFromTrial API",
    version="0.1.0",
    lifespan=lifespan,
    root_path="/api",
)

# ============================================
# Middleware (ORDER MATTERS!)
# ============================================

# 1. Session middleware (for authentication)
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if os.environ.get("ENVIRONMENT") == "production":
        raise RuntimeError("SECRET_KEY must be set in production!")
    SECRET_KEY = "dev-secret-key-CHANGE-IN-PRODUCTION"
    print("⚠️  WARNING: Using dev SECRET_KEY. Set SECRET_KEY in production!")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET"],
    same_site="lax",
    https_only=True,
)


# 2. CORS middleware
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", 
    "http://localhost:" \
    "3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,  # Important for cookies/sessions
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Routes
# ============================================

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "FreeFromTrial API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
        "environment": os.environ.get("ENVIRONMENT", "development")
    }

# Register routers
app.include_router(health_router)
app.include_router(oauth_router)   # ✅ NEW
app.include_router(auth_router)    # ✅ NEW
app.include_router(trials_router)
app.include_router(webhooks_router)
from routes.jobs import router as jobs_router
app.include_router(jobs_router)
