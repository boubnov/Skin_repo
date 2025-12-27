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

# User Products (Inventory)
class UserProductBase(BaseModel):
    product_name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    status: str = "active" # active, archived, wishlist (replacing safe/unsafe logic mainly)
    notes: Optional[str] = None
    rating: Optional[int] = None

class UserProductCreate(UserProductBase):
    pass

class UserProductResponse(UserProductBase):
    id: int
    user_id: int
    date_opened: Optional[datetime] = None
    verification_status: str = "ready"
    is_analyzing: bool = False
    
    class Config:
        from_attributes = True

# Routine V2
class RoutineItemCreate(BaseModel):
    name: str
    period: str # am/pm
    step_order: int = 0
    user_product_id: Optional[int] = None
    frequency_type: str = "daily"
    frequency_details: Optional[list] = None # e.g. [0, 2, 4]

class RoutineItemResponse(BaseModel):
    id: int
    name: str
    period: str
    is_completed: bool = False
    user_product_id: Optional[int] = None
    product_details: Optional[UserProductResponse] = None # If we join it
    
    class Config:
        from_attributes = True

# Journal
class JournalEntryBase(BaseModel):
    overall_condition: int # 1-5
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    tags: Optional[list] = None # ["acne", "dry"]

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntryResponse(JournalEntryBase):
    id: int
    user_id: int
    date: datetime
    
    class Config:
        from_attributes = True

# Products (Global)
class ProductResponse(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    confidence_tier: Optional[str] = "scraped"
    is_verified: bool = False
    image_url: Optional[str] = None
    description: Optional[str] = None
    price_tier: Optional[str] = None
    store_links: Optional[dict] = None # JSONB
    # embedding: List[float] # Omitted for performance unless needed
    
    class Config:
        from_attributes = True
