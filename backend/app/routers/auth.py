from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from .. import crud, schemas, auth, database

router = APIRouter(prefix="/auth", tags=["auth"])

from datetime import datetime, timezone

@router.post("/google", response_model=schemas.Token)
def login_with_google(login_request: schemas.SocialLoginRequest, db: Session = Depends(database.get_db)):
    # 1. Verify the Token with Google
    google_user_data = auth.verify_google_token(login_request.id_token)
    
    if not google_user_data:
        raise HTTPException(status_code=400, detail="Invalid Google Token")
    
    email = google_user_data.get("email")
    social_id = google_user_data.get("sub")
    
    if not email:
        raise HTTPException(status_code=400, detail="Token missing email")

    # 2. Check if user exists
    user = crud.get_user_by_email(db, email=email)
    
    # --- LEGAL GATE LOGIC START ---
    
    # Check if we need to update/enforce ToS
    has_accepted_previously = user and user.tos_accepted_at is not None
    
    if not has_accepted_previously:
        if not login_request.tos_agreed:
            raise HTTPException(
                status_code=403, 
                detail="Terms of Service acceptance is required."
            )
    
    # If user doesn't exist, create them
    if not user:
        user = crud.create_social_user(db, email=email, social_id=social_id, provider="google")
        # Record acceptance
        user.tos_accepted_at = datetime.now(timezone.utc)
        db.commit()
    elif not has_accepted_previously and login_request.tos_agreed:
        # User existed but is accepting now
        user.tos_accepted_at = datetime.now(timezone.utc)
        db.commit()
        
    # --- LEGAL GATE LOGIC END ---
    
    # 3. Generate Session Token (JWT) for our app
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
