from sqlalchemy.orm import Session
from . import models, schemas, auth

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_social_id(db: Session, social_id: str, provider: str):
    return db.query(models.User).filter(
        models.User.social_id == social_id, 
        models.User.social_provider == provider
    ).first()

def create_social_user(db: Session, email: str, social_id: str, provider: str):
    db_user = models.User(
        email=email, 
        social_id=social_id, 
        social_provider=provider
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_profile(db: Session, user_id: int, profile: schemas.ProfileCreate):
    # 1. Update/Create Base Profile
    db_profile = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    if not db_profile:
        db_profile = models.Profile(user_id=user_id, **profile.dict(exclude_unset=True))
        db.add(db_profile)
    else:
        for key, value in profile.dict(exclude_unset=True).items():
            setattr(db_profile, key, value)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile
