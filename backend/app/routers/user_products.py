from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from .. import database, models, schemas
from ..dependencies import get_current_user

router = APIRouter(prefix="/products", tags=["user_products"])

@router.get("/", response_model=List[schemas.UserProductResponse])
def get_products(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get all products in user's inventory (Shelf)."""
    return current_user.products

@router.post("/", response_model=schemas.UserProductResponse)
def add_product(
    product: schemas.UserProductCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db),
    skip_safety_check: bool = False  # Allow "Add Anyway" override
):
    """
    Add a product to the shelf with Safety Guard conflict checking.
    
    Returns 200 with safety_warning if conflicts detected (but still adds product).
    Set skip_safety_check=True to bypass conflict detection.
    """
    from ..services.conflict_rules import check_routine_conflicts
    
    safety_warning = None
    conflicts = []
    
    if not skip_safety_check:
        # Get user's routine products
        routine_items = db.query(models.RoutineItem).filter(
            models.RoutineItem.user_id == current_user.id,
            models.RoutineItem.is_active == True
        ).all()
        
        # Collect ingredients from routine products (from product notes/ingredients)
        routine_ingredients = []
        for item in routine_items:
            if item.user_product and item.user_product.notes:
                # Parse ingredients from notes (format: "Ingredients: A, B, C")
                notes = item.user_product.notes
                if notes.startswith("Ingredients:"):
                    ing_text = notes.replace("Ingredients:", "").strip()
                    routine_ingredients.extend([i.strip() for i in ing_text.split(",")])
        
        # Get new product's ingredients from notes
        new_product_ingredients = []
        if product.notes and product.notes.startswith("Ingredients:"):
            ing_text = product.notes.replace("Ingredients:", "").strip()
            new_product_ingredients = [i.strip() for i in ing_text.split(",")]
        
        # Check for conflicts
        if new_product_ingredients and routine_ingredients:
            conflicts = check_routine_conflicts(
                product_ingredients=new_product_ingredients,
                routine_ingredients=routine_ingredients
            )
            
            if conflicts:
                # Build specific warning message
                critical = [c for c in conflicts if c["risk_level"] == "CRITICAL"]
                if critical:
                    c = critical[0]
                    safety_warning = {
                        "has_critical": True,
                        "message": f"⚠️ This product contains {c['ingredient_a']}, which {c['interaction_type']}s with {c['ingredient_b']} in your routine.",
                        "recommendation": c["recommended_adjustment"],
                        "conflicts": conflicts
                    }
                else:
                    c = conflicts[0]
                    safety_warning = {
                        "has_critical": False,
                        "message": f"⚡ Note: {c['ingredient_a']} may interact with {c['ingredient_b']} in your routine.",
                        "recommendation": c["recommended_adjustment"],
                        "conflicts": conflicts
                    }
    
    # Create the product (Safety Guard is advisory, not blocking)
    db_product = models.UserProduct(
        **product.model_dump(),
        user_id=current_user.id
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Return product with optional safety warning
    response = schemas.UserProductResponse.model_validate(db_product)
    
    # Attach warning to response (frontend will show SafetyGuardOverlay)
    if safety_warning:
        # Note: In production, use a proper response model with warning field
        response.__dict__["safety_warning"] = safety_warning
    
    return response

@router.put("/{product_id}", response_model=schemas.UserProductResponse)
def update_product(
    product_id: int,
    product_update: schemas.UserProductCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Update product details (status, notes, etc)."""
    db_product = db.query(models.UserProduct).filter(
        models.UserProduct.id == product_id,
        models.UserProduct.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    for key, value in product_update.model_dump(exclude_unset=True).items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Remove product from shelf."""
    db_product = db.query(models.UserProduct).filter(
        models.UserProduct.id == product_id,
        models.UserProduct.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db.delete(db_product)
    db.commit()
    return {"status": "success"}
