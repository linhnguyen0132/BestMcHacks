from fastapi import Request, HTTPException, status
from core.database import get_db
from bson import ObjectId

async def get_current_user(request: Request) -> dict:
    """
    Get authenticated user from session.
    Raises 401 if not authenticated.
    Use as dependency: user = Depends(get_current_user)
    """
    user_id = request.session.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in."
        )
    
    # Get user from database
    db = get_db()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

def create_session(request: Request, user_id: str, email: str):
    """Create user session after successful OAuth"""
    request.session["user_id"] = user_id
    request.session["email"] = email

def destroy_session(request: Request):
    """Destroy user session on logout"""
    request.session.clear()