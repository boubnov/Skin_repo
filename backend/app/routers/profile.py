from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from .. import database, models
from ..auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    skin_type: Optional[str] = None
    phone: Optional[str] = None
    instagram: Optional[str] = None
    concerns: Optional[List[str]] = None
    ethnicity: Optional[str] = None
    location: Optional[str] = None

class ProfileResponse(BaseModel):
    id: int
    username: Optional[str]
    name: Optional[str]
    email: Optional[str]
    age: Optional[int]
    skin_type: Optional[str]
    phone: Optional[str]
    instagram: Optional[str]
    concerns: Optional[List[str]]
    
    class Config:
        from_attributes = True

@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get the current user's profile."""
    profile = db.query(models.Profile).filter(
        models.Profile.user_id == current_user.id
    ).first()
    
    if not profile:
        # Create empty profile if doesn't exist
        profile = models.Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return ProfileResponse(
        id=profile.id,
        username=profile.username,
        name=profile.name,
        email=current_user.email,
        age=profile.age,
        skin_type=profile.skin_type,
        phone=profile.phone,
        instagram=profile.instagram,
        concerns=profile.concerns
    )

@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    profile_data: ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Update the current user's profile."""
    profile = db.query(models.Profile).filter(
        models.Profile.user_id == current_user.id
    ).first()
    
    if not profile:
        # Create new profile
        profile = models.Profile(user_id=current_user.id)
        db.add(profile)

    # Check username uniqueness if changing
    if profile_data.username is not None and profile_data.username != profile.username:
        # Check if username exists
        existing = db.query(models.Profile).filter(
            models.Profile.username == profile_data.username
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        profile.username = profile_data.username
    
    # Update fields if provided
    if profile_data.name is not None:
        profile.name = profile_data.name
    if profile_data.age is not None:
        profile.age = profile_data.age
    if profile_data.skin_type is not None:
        profile.skin_type = profile_data.skin_type
    if profile_data.phone is not None:
        profile.phone = profile_data.phone
    if profile_data.instagram is not None:
        profile.instagram = profile_data.instagram
    if profile_data.concerns is not None:
        profile.concerns = profile_data.concerns
    if profile_data.ethnicity is not None:
        profile.ethnicity = profile_data.ethnicity
    if profile_data.location is not None:
        profile.location = profile_data.location
    
    db.commit()
    db.refresh(profile)
    
    return ProfileResponse(
        id=profile.id,
        username=profile.username,
        name=profile.name,
        email=current_user.email,
        age=profile.age,
        skin_type=profile.skin_type,
        phone=profile.phone,
        instagram=profile.instagram,
        concerns=profile.concerns
    )
