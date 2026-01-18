from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
import os

from core.database import init_db, close_db
from routes.health import router as health_router
from routes.trials import router as trials_router

# Lifespan context manager (startup/shutdown)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    print("🚀 Starting FreeFromTrial API...")
    await init_db()
    print("✅ Database connected and indexed")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    close_db()
    print("✅ Database connection closed")

# Create FastAPI app (ONLY ONCE!)
app = FastAPI(
    title="FreeFromTrial API",
    version="0.1.0",
    lifespan=lifespan
)

# ============================================
# Middleware (ORDER MATTERS!)
# ============================================

# 1. Session middleware (for authentication)
# Get from environment or use default for development
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
if SECRET_KEY == "dev-secret-change-in-production":
    print("⚠️  WARNING: Using default SECRET_KEY. Set SECRET_KEY in production!")

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    max_age=30 * 24 * 60 * 60,  # 30 days
    same_site="lax",
    https_only=False  # Set to True in production with HTTPS
)

# 2. CORS middleware (for frontend requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Local frontend dev
        "http://localhost:5173",      # Vite default port
        "https://yourapp.com",        # Production frontend
    ],
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
        "docs": "/docs"
    }

# Register routers
app.include_router(health_router)
app.include_router(trials_router)

# TODO: Add these when ready
# from routes.oauth import router as oauth_router
# from routes.auth import router as auth_router
# app.include_router(oauth_router)
# app.include_router(auth_router)