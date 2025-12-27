# Safety Guard Router - Active Conflict Engine API
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..services.conflict_rules import check_routine_conflicts, RiskLevel

router = APIRouter(prefix="/safety", tags=["Safety Guard"])


class IngredientList(BaseModel):
    """List of ingredients for conflict checking."""
    ingredients: List[str]


class RoutineCheckRequest(BaseModel):
    """Request body for checking routine conflicts."""
    product_ingredients: List[str]  # Ingredients of the product being added
    routine_ingredients: List[str]  # Combined ingredients of existing routine products
    routine_slot: Optional[str] = None  # "morning" or "evening"


class ConflictResponse(BaseModel):
    """A single conflict result."""
    risk_level: str
    ingredient_a: str
    ingredient_b: str
    interaction_type: str
    reasoning: str
    recommended_adjustment: str
    source: str


class CheckConflictsResponse(BaseModel):
    """Response for conflict check."""
    has_conflicts: bool
    has_critical: bool
    conflicts: List[ConflictResponse]
    message: str


@router.post("/check-routine", response_model=CheckConflictsResponse)
def check_routine_for_conflicts(request: RoutineCheckRequest):
    """
    Check if adding a product to a routine would cause ingredient conflicts.
    
    This is the Tier 1 (Rule-Based) conflict detection.
    Fast (<500ms), zero API cost.
    """
    conflicts = check_routine_conflicts(
        product_ingredients=request.product_ingredients,
        routine_ingredients=request.routine_ingredients
    )
    
    has_critical = any(c["risk_level"] == "CRITICAL" for c in conflicts)
    
    if not conflicts:
        message = "No conflicts detected. Safe to add to routine."
    elif has_critical:
        message = "⚠️ CRITICAL: Dangerous ingredient combination detected. Review before proceeding."
    else:
        message = "⚡ Warning: Some ingredient interactions detected. Review recommendations."
    
    return CheckConflictsResponse(
        has_conflicts=len(conflicts) > 0,
        has_critical=has_critical,
        conflicts=[ConflictResponse(**c) for c in conflicts],
        message=message
    )


@router.post("/check-ingredients", response_model=CheckConflictsResponse)
def check_ingredients_compatibility(
    ingredient_list_a: IngredientList,
    ingredient_list_b: IngredientList
):
    """
    Check if two ingredient lists have conflicts.
    Useful for quick product-to-product comparison.
    """
    conflicts = check_routine_conflicts(
        product_ingredients=ingredient_list_a.ingredients,
        routine_ingredients=ingredient_list_b.ingredients
    )
    
    has_critical = any(c["risk_level"] == "CRITICAL" for c in conflicts)
    
    if not conflicts:
        message = "These products are compatible."
    elif has_critical:
        message = "⚠️ CRITICAL: These products should not be used together."
    else:
        message = "⚡ Caution: Some interactions detected."
    
    return CheckConflictsResponse(
        has_conflicts=len(conflicts) > 0,
        has_critical=has_critical,
        conflicts=[ConflictResponse(**c) for c in conflicts],
        message=message
    )


@router.get("/known-conflicts")
def get_known_conflicts():
    """
    Return the list of all known ingredient conflicts in the database.
    Useful for frontend display and education.
    """
    from ..services.conflict_rules import CONFLICT_RULES
    
    return {
        "total_rules": len(CONFLICT_RULES),
        "conflicts": [
            {
                "ingredient_a": rule.ingredient_a,
                "ingredient_a_aliases": rule.ingredient_a_aliases,
                "ingredient_b": rule.ingredient_b,
                "ingredient_b_aliases": rule.ingredient_b_aliases,
                "risk_level": rule.risk_level.value,
                "interaction_type": rule.interaction_type,
                "reasoning": rule.reasoning,
                "recommended_adjustment": rule.recommended_adjustment,
                "source": rule.source
            }
            for rule in CONFLICT_RULES
        ]
    }
