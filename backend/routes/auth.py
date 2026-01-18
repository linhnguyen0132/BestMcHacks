from fastapi import APIRouter, Depends, Request
from core.auth import get_current_user, destroy_session
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

class UserResponse(BaseModel):
    """User info returned to frontend"""
    id: str
    email: str
    name: str
    picture: str | None

@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """
    Get current authenticated user.
    Frontend calls this to check if user is logged in.
    """
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture")
    }

@router.post("/logout")
async def logout(request: Request):
    """Logout current user"""
    destroy_session(request)
    return {"message": "Logged out successfully"}