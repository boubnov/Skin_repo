from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date, timedelta
import json

from .. import database, models, auth
from ..dependencies import get_current_user

router = APIRouter(prefix="/routine", tags=["routine"])

class RoutineItemOut(BaseModel):
    id: int
    name: str
    period: str
    is_completed: bool

class RoutineResponse(BaseModel):
    am: List[RoutineItemOut]
    pm: List[RoutineItemOut]
    streak: int

@router.get("/", response_model=RoutineResponse)
def get_today_routine(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # 1. Ensure User has specific items (Seed if empty)
    existing_items = current_user.routine_items
    if not existing_items:
        # Seed default routine
        defaults = [
            {"name": "Cleanser", "period": "am", "order": 1},
            {"name": "Moisturizer + SPF", "period": "am", "order": 2},
            {"name": "Cleanser", "period": "pm", "order": 1},
            {"name": "Treatment (Retinol/Acid)", "period": "pm", "order": 2},
            {"name": "Moisturizer", "period": "pm", "order": 3},
        ]
        for d in defaults:
            db_item = models.RoutineItem(
                user_id=current_user.id,
                name=d["name"],
                period=d["period"],
                step_order=d["order"]
            )
            db.add(db_item)
        db.commit()
        db.refresh(current_user)
        existing_items = current_user.routine_items

    # 2. Get Today's Log
    today_str = date.today().strftime("%Y-%m-%d")
    # Retrieve log by comparing Date content (ignoring time) might be tricky in some SQLs
    # Simplest for MVP: Filter by range or just checking string cast match if SQLite/Postgres allows.
    # We'll use python side filtering or >= today's midnight.
    
    today = date.today()
    log = db.query(models.RoutineLog).filter(
        models.RoutineLog.user_id == current_user.id,
        func.date(models.RoutineLog.log_date) == today
    ).first()

    completed_ids = []
    if log and log.completed_items:
        completed_ids = json.loads(log.completed_items)

    # 3. Calculate Streak
    # Iterate backwards from yesterday
    streak = 0
    check_date = today - timedelta(days=1)
    
    # If today has ANY completion, streak includes today? 
    # Usually streaks count completed days. If today is partial, maybe we don't count it yet?
    # Or we start form yesterday. Let's start from yesterday for "Completed Streaks".
    # BUT, if I did it today, I want to see (N+1). 
    # Logic: If today has entries, streak = current_streak + 1. 
    # Let's count consecutive days in DB.
    
    # Find all logs for user
    all_logs = db.query(models.RoutineLog).filter(
        models.RoutineLog.user_id == current_user.id
    ).order_by(models.RoutineLog.log_date.desc()).all()
    
    # Simple logic: Extract set of dates with activity
    active_dates = set()
    for l in all_logs:
        if l.completed_items and json.loads(l.completed_items): # Has at least one item done
             active_dates.add(l.log_date.date())
    
    # Check today
    current_streak = 0
    cursor = today
    if cursor in active_dates:
        current_streak += 1
    
    # Check backwards
    cursor -= timedelta(days=1)
    while cursor in active_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    # 4. Format Response
    am_items = []
    pm_items = []
    
    for item in existing_items:
        out = {
            "id": item.id,
            "name": item.name,
            "period": item.period,
            "is_completed": item.id in completed_ids
        }
        if item.period == "am":
            am_items.append(out)
        else:
            pm_items.append(out)
            
    return {"am": am_items, "pm": pm_items, "streak": current_streak}

@router.post("/toggle/{item_id}")
def toggle_item(
    item_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # Get Today's Log
    today = date.today()
    log = db.query(models.RoutineLog).filter(
        models.RoutineLog.user_id == current_user.id,
        func.date(models.RoutineLog.log_date) == today
    ).first()

    if not log:
        log = models.RoutineLog(user_id=current_user.id, completed_items="[]")
        db.add(log)
        db.commit()
    
    current_list = json.loads(log.completed_items or "[]")
    
    if item_id in current_list:
        current_list.remove(item_id)
    else:
        current_list.append(item_id)
        
    log.completed_items = json.dumps(current_list)
    db.commit()
    
    return {"status": "success", "new_list": current_list}
