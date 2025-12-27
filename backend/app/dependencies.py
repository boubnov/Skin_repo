import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from . import database, models, auth

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/google", auto_error=False)

# DEV MODE: Set DEV_MODE=1 to bypass authentication for testing
DEV_MODE = os.environ.get("DEV_MODE", "0") == "1"

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    # DEV BYPASS: Return or create a test user when DEV_MODE is enabled
    if DEV_MODE:
        test_email = "dev@test.com"
        user = db.query(models.User).filter(models.User.email == test_email).first()
        if not user:
            user = models.User(email=test_email, social_provider="dev", social_id="dev_bypass_user")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
