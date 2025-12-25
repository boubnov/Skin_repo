from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from .. import database, models, schemas
from ..dependencies import get_current_user

router = APIRouter(
    prefix="/journal",
    tags=["journal"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.JournalEntryResponse])
def get_journal_entries(
    skip: int = 0, 
    limit: int = 50,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get generic timeline/journal entries (History V2).
    """
    entries = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user.id
    ).order_by(models.JournalEntry.date.desc()).offset(skip).limit(limit).all()
    return entries

@router.post("/", response_model=schemas.JournalEntryResponse)
def create_journal_entry(
    entry: schemas.JournalEntryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Log a daily check-in (Condition, Notes, Photo).
    """
    db_entry = models.JournalEntry(
        user_id=current_user.id,
        **entry.model_dump()
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.delete("/{entry_id}")
def delete_entry(
    entry_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    db_entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == current_user.id
    ).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    db.delete(db_entry)
    db.commit()
    return {"status": "success"}
