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
    product_logs = relationship("UserProductLog", back_populates="user")
    routine_items = relationship("RoutineItem", back_populates="user")
    routine_logs = relationship("RoutineLog", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
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

class UserProductLog(Base):
    __tablename__ = "user_product_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_name = Column(String, index=True)
    brand = Column(String, nullable=True) # Optional, helps matching
    status = Column(String) # "safe", "unsafe", "wishlist"
    notes = Column(Text, nullable=True) # "Caused breakout", "Loved it"
    rating = Column(Integer, nullable=True)
    log_date = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="product_logs")

class RoutineItem(Base):
    __tablename__ = "routine_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)  # e.g. "Cleanser", "Retinol"
    period = Column(String) # "am", "pm"
    step_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="routine_items")

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
    name = Column(String, index=True)
    brand = Column(String, index=True)
    description = Column(Text) # The fuzzy text
    ingredients_text = Column(Text) # Raw ingredients string
    
    # Hybrid Search Columns - use PostgreSQL types in production, fallbacks for testing
    if HAS_PG_TYPES:
        # PostgreSQL with pgvector extension
        embedding = Column(Vector(1536))
        metadata_info = Column(JSONB)  # e.g. {"skin_type": "oily", "price": 25}
        search_vector = Column(TSVECTOR)  # For Full Text Search
    else:
        # SQLite-compatible fallbacks for testing
        embedding = Column(Text, nullable=True)  # Store as JSON string
        metadata_info = Column(JSON, nullable=True)  # Use generic JSON
        search_vector = Column(Text, nullable=True)  # Store keywords as text 
