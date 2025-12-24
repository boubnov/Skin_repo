from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, schemas, models
from ..dependencies import get_current_user
from .. import database

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me/profile", response_model=schemas.Profile)
def update_user_profile(
    profile: schemas.ProfileCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Create or Update the user's skincare profile (Age, Ethnicity, Skin Type).
    """
    updated_profile = crud.update_profile(db, user_id=current_user.id, profile=profile)
    return updated_profile
