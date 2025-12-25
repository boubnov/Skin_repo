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
    # V2 Fields
    user_product_id: int | None = None
    product_details: dict | None = None # Simplified representation of UserProduct

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
                step_order=d["order"],
                frequency_type="daily" # Default V2
            )
            db.add(db_item)
        db.commit()
        db.refresh(current_user)
        existing_items = current_user.routine_items

    # 2. Get Today's Log
    today = date.today()
    log = db.query(models.RoutineLog).filter(
        models.RoutineLog.user_id == current_user.id,
        func.date(models.RoutineLog.log_date) == today
    ).first()

    completed_ids = []
    if log and log.completed_items:
        completed_ids = json.loads(log.completed_items)

    # 3. Calculate Streak (Existing Logic Simplified)
    current_streak = 0
    # ... (Keep existing streak logic roughly same, assumed external calculation or optimized query)
    # For speed, let's trust the FE to fetch streak from separate call or optimize later.
    # Re-using previous Session-based logic:
    all_logs = db.query(models.RoutineLog).filter(
        models.RoutineLog.user_id == current_user.id
    ).order_by(models.RoutineLog.log_date.desc()).all()
    
    active_dates = set()
    for l in all_logs:
        if l.completed_items and json.loads(l.completed_items): 
             active_dates.add(l.log_date.date())
    
    cursor = today
    if cursor in active_dates: current_streak += 1
    cursor -= timedelta(days=1)
    while cursor in active_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    # 4. Format Response with Product Details
    am_items = []
    pm_items = []
    
    for item in existing_items:
        # Resolve Product Details if linked
        prod_det = None
        if item.user_product:
             prod_det = {
                 "id": item.user_product.id,
                 "name": item.user_product.product_name,
                 "brand": item.user_product.brand,
                 "category": item.user_product.category
             }

        out = {
            "id": item.id,
            "name": item.user_product.product_name if item.user_product else item.name, # Use specific name if linked
            "period": item.period,
            "is_completed": item.id in completed_ids,
            "user_product_id": item.user_product_id,
            "product_details": prod_det
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

class RoutineItemUpdate(BaseModel):
    name: str | None = None
    step_order: int | None = None
    user_product_id: int | None = None
    frequency_type: str | None = None
    frequency_details: List[int] | None = None

@router.put("/item/{item_id}", response_model=RoutineItemOut)
def update_routine_item(
    item_id: int,
    item_update: RoutineItemUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Update a routine item's definition (e.g. link it to a specific product).
    """
    db_item = db.query(models.RoutineItem).filter(
        models.RoutineItem.id == item_id,
        models.RoutineItem.user_id == current_user.id
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    for key, value in item_update.model_dump(exclude_unset=True).items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    
    # Return formatted response
    # Re-calculate or re-fetch details if needed, but for MVP basic fields are enough.
    # Note: response model anticipates joined fields, let's ensure they populate.
    
    return RoutineItemOut(
        id=db_item.id,
        name=db_item.name,
        period=db_item.period,
        is_completed=False, # Status is not persistent in Item definition
        user_product_id=db_item.user_product_id,
        # Manually constructing details if linked, or let Pydantic try from attributes if lazy loaded
        product_details={"id": db_item.user_product.id, "name": db_item.user_product.product_name} if db_item.user_product else None
    )
