from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base, IS_SQLITE

# Conditionally import PostgreSQL types only when using PostgreSQL
if not IS_SQLITE:
    try:
        from pgvector.sqlalchemy import Vector
        from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
        HAS_PG_TYPES = True
    except ImportError:
        HAS_PG_TYPES = False
else:
    HAS_PG_TYPES = False

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    social_provider = Column(String) # e.g. "google", "apple"
    social_id = Column(String, index=True) # Unique ID from the provider
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tos_accepted_at = Column(DateTime(timezone=True), nullable=True)

    profile = relationship("Profile", back_populates="user", uselist=False)
    history = relationship("SkinHistory", back_populates="user", uselist=False)
    products = relationship("UserProduct", back_populates="user")
    routine_items = relationship("RoutineItem", back_populates="user")
    routine_logs = relationship("RoutineLog", back_populates="user")
    journal_entries = relationship("JournalEntry", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    username = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    ethnicity = Column(String, nullable=True)
    location = Column(String, nullable=True)
    skin_type = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    instagram = Column(String, nullable=True)
    concerns = Column(JSON, nullable=True)  # List of skin concerns
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="profile")

class SkinHistory(Base):
    __tablename__ = "skin_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    allergies = Column(Text, nullable=True)
    skin_conditions = Column(Text, nullable=True)

    user = relationship("User", back_populates="history")

class UserProduct(Base):
    __tablename__ = "user_products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_name = Column(String, index=True)
    brand = Column(String, nullable=True)
    status = Column(String) # "active", "empty", "archived" (formerly safe/unsafe, now used for shelf status mostly? Or keep safe/unsafe and add is_active?)
    # Expert Note: For V2, let's keep status for "Safe/Unsafe" tracking, but add 'is_active' for Shelf visibility if needed.
    # actually, purely renaming Log -> Product implies this IS the relationship.
    # Let's keep fields flexible.
    category = Column(String, nullable=True) # e.g. "Cleanser", "Serum"
    notes = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    date_opened = Column(DateTime(timezone=True), nullable=True)
    date_finished = Column(DateTime(timezone=True), nullable=True)
    log_date = Column(DateTime(timezone=True), server_default=func.now()) # Keep for legacy/ordering

    user = relationship("User", back_populates="products")
    routine_steps = relationship("RoutineItem", back_populates="user_product")

class RoutineItem(Base):
    __tablename__ = "routine_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_product_id = Column(Integer, ForeignKey("user_products.id"), nullable=True) # Link to specific inventory
    
    name = Column(String)  # Display name (Generic or overridden)
    period = Column(String) # "am", "pm"
    step_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Frequency Logic (V2)
    # frequency_type: "daily", "days_of_week", "interval"
    frequency_type = Column(String, default="daily") 
    # frequency_details: JSON e.g. [0, 2, 4] for Mon/Wed/Fri or {"every_n_days": 2}
    frequency_details = Column(JSON, nullable=True)

    user = relationship("User", back_populates="routine_items")
    user_product = relationship("UserProduct", back_populates="routine_steps")

class RoutineLog(Base):
    __tablename__ = "routine_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    log_date = Column(DateTime(timezone=True), server_default=func.now())
    completed_items = Column(Text) # JSON string of IDs e.g. "[1, 3, 5]"

    user = relationship("User", back_populates="routine_logs")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    
    # 1. Core Identity
    name = Column(String, index=True)
    brand = Column(String, index=True)
    category = Column(String, index=True)  # e.g. "Moisturizer", "Serum"
    barcode = Column(String, index=True, unique=True, nullable=True) # UPC/EAN for scanning
    
    # 2. The "Tiered" Trust System
    # "verified" = Manually checked. "scraped" = Bot found.
    confidence_tier = Column(String, default="scraped") 
    
    # 3. Rich Media
    image_url = Column(String, nullable=True)
    
    # 4. The "Brain" (Hybrid Search)
    description = Column(Text) # Marketing text
    ingredients_text = Column(Text) # Raw ingredients
    
    # 5. Commerce
    price_tier = Column(String, index=True) # "budget", "mid", "luxury"
    # {"sephora": "url...", "amazon": "url..."}
    
    # Hybrid Search Columns
    if HAS_PG_TYPES:
        # PostgreSQL with pgvector extension
        embedding = Column(Vector(1536))
        metadata_info = Column(JSONB)
        store_links = Column(JSONB)
        search_vector = Column(TSVECTOR)
    else:
        # SQLite-compatible fallbacks
        embedding = Column(Text, nullable=True)
        metadata_info = Column(JSON, nullable=True)
        store_links = Column(JSON, nullable=True)
        search_vector = Column(Text, nullable=True) 

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    overall_condition = Column(Integer) # Scale 1-5 (5 = Great)
    notes = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True) # URL to photo (local or S3)
    tags = Column(JSON, nullable=True) # e.g. ["breakout", "dryness"]
    
    user = relationship("User", back_populates="journal_entries")
