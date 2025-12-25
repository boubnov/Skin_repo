from contextlib import asynccontextmanager
from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()
from app.database import engine, Base
from app.routers import auth, chat, users, history, routine, profile, user_products, journal

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (not at import time)
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup on shutdown (if needed)

app = FastAPI(title="Skincare AI Backend", lifespan=lifespan)

# CORS Configuration
# CORS (Allow mobile app to verify)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(users.router)
app.include_router(history.router)
app.include_router(routine.router)
app.include_router(profile.router)
app.include_router(user_products.router)
app.include_router(journal.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Skincare AI Agent API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
