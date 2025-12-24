from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ProfileBase(BaseModel):
    age: Optional[int] = None
    ethnicity: Optional[str] = None
    location: Optional[str] = None
    skin_type: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class Profile(ProfileBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    # No password needed for social login creation internal logic
    social_provider: str
    social_id: str

class User(UserBase):
    id: int
    social_provider: str
    is_active: bool
    created_at: datetime
    profile: Optional[Profile] = None

    class Config:
        from_attributes = True

class SocialLoginRequest(BaseModel):
    id_token: str
    provider: str = "google" # Default to google
    tos_agreed: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
