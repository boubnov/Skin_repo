# Safety Guard: Conflict Rules Engine (Tier 1 - Rule-Based)
# This module contains the deterministic conflict detection logic.

from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"  # High risk of barrier damage or chemical burn
    WARNING = "WARNING"    # Ingredients cancel each other out
    ADVICE = "ADVICE"      # Suboptimal layering order


@dataclass
class ConflictRule:
    ingredient_a: str
    ingredient_a_aliases: List[str]
    ingredient_b: str
    ingredient_b_aliases: List[str]
    risk_level: RiskLevel
    interaction_type: str
    reasoning: str
    recommended_adjustment: str
    source: str


# Top 20 Known Ingredient Conflict Pairings
CONFLICT_RULES: List[ConflictRule] = [
    ConflictRule(
        ingredient_a="RETINOL",
        ingredient_a_aliases=["Retinyl Palmitate", "Tretinoin", "Adapalene", "Retinaldehyde", "Retin-A", "Differin"],
        ingredient_b="GLYCOLIC ACID",
        ingredient_b_aliases=["AHA", "Alpha Hydroxy Acid", "Lactic Acid", "Mandelic Acid"],
        risk_level=RiskLevel.CRITICAL,
        interaction_type="irritation",
        reasoning="Combining retinoids with AHAs causes severe barrier damage and irritation.",
        recommended_adjustment="Use Retinol PM only; move AHA to morning or alternate days.",
        source="AAD Guidelines"
    ),
    ConflictRule(
        ingredient_a="RETINOL",
        ingredient_a_aliases=["Retinyl Palmitate", "Tretinoin", "Adapalene"],
        ingredient_b="BENZOYL PEROXIDE",
        ingredient_b_aliases=["BPO", "Benzoyl"],
        risk_level=RiskLevel.CRITICAL,
        interaction_type="deactivation",
        reasoning="Benzoyl Peroxide oxidizes and deactivates retinoids, making them ineffective.",
        recommended_adjustment="Apply BPO in AM and Retinol in PM, or use on alternate days.",
        source="Paula's Choice"
    ),
    ConflictRule(
        ingredient_a="L-ASCORBIC ACID",
        ingredient_a_aliases=["Vitamin C", "Ascorbyl Glucoside", "Ascorbic Acid", "Sodium Ascorbyl Phosphate"],
        ingredient_b="NIACINAMIDE",
        ingredient_b_aliases=["Nicotinamide", "Vitamin B3"],
        risk_level=RiskLevel.WARNING,
        interaction_type="reduced_efficacy",
        reasoning="May reduce efficacy of Vitamin C at high concentrations (debated, but worth noting).",
        recommended_adjustment="Layer with a wait time of 15 minutes, or use at different times of day.",
        source="Cosmetic Chemist"
    ),
    ConflictRule(
        ingredient_a="L-ASCORBIC ACID",
        ingredient_a_aliases=["Vitamin C", "Ascorbic Acid"],
        ingredient_b="COPPER PEPTIDES",
        ingredient_b_aliases=["GHK-Cu", "Copper Tripeptide"],
        risk_level=RiskLevel.WARNING,
        interaction_type="oxidation",
        reasoning="Copper can oxidize Vitamin C, reducing its effectiveness.",
        recommended_adjustment="Use Vitamin C in AM and Copper Peptides in PM.",
        source="The Ordinary"
    ),
    ConflictRule(
        ingredient_a="BENZOYL PEROXIDE",
        ingredient_a_aliases=["BPO"],
        ingredient_b="L-ASCORBIC ACID",
        ingredient_b_aliases=["Vitamin C", "Ascorbic Acid"],
        risk_level=RiskLevel.CRITICAL,
        interaction_type="deactivation",
        reasoning="Benzoyl Peroxide oxidizes and completely neutralizes Vitamin C.",
        recommended_adjustment="Never layer. Use BP in AM and Vitamin C in PM.",
        source="Dermatology Research"
    ),
    ConflictRule(
        ingredient_a="GLYCOLIC ACID",
        ingredient_a_aliases=["AHA", "Alpha Hydroxy Acid"],
        ingredient_b="SALICYLIC ACID",
        ingredient_b_aliases=["BHA", "Beta Hydroxy Acid"],
        risk_level=RiskLevel.WARNING,
        interaction_type="over-exfoliation",
        reasoning="Layering multiple acids increases risk of over-exfoliation and barrier damage.",
        recommended_adjustment="Use one acid per day, or on alternate days.",
        source="Skincare by Hyram"
    ),
    ConflictRule(
        ingredient_a="HYDROQUINONE",
        ingredient_a_aliases=[],
        ingredient_b="BENZOYL PEROXIDE",
        ingredient_b_aliases=["BPO"],
        risk_level=RiskLevel.CRITICAL,
        interaction_type="staining",
        reasoning="Causes dark staining on skin and severe irritation.",
        recommended_adjustment="Never combine. Use on completely different days.",
        source="FDA Warning"
    ),
    ConflictRule(
        ingredient_a="PEPTIDES",
        ingredient_a_aliases=["Matrixyl", "Argireline", "Copper Peptides", "Palmitoyl"],
        ingredient_b="GLYCOLIC ACID",
        ingredient_b_aliases=["AHA", "Direct Acids", "Lactic Acid"],
        risk_level=RiskLevel.WARNING,
        interaction_type="breakdown",
        reasoning="Acids can break down peptide bonds, reducing efficacy.",
        recommended_adjustment="Apply peptides before acids, or use at different times.",
        source="Cosmetic Formulator"
    ),
    ConflictRule(
        ingredient_a="RETINOL",
        ingredient_a_aliases=["Tretinoin", "Retinyl Palmitate"],
        ingredient_b="SALICYLIC ACID",
        ingredient_b_aliases=["BHA", "Beta Hydroxy Acid"],
        risk_level=RiskLevel.ADVICE,
        interaction_type="sensitivity",
        reasoning="May increase skin sensitivity when layered together.",
        recommended_adjustment="Use Retinol PM and BHA AM, or alternate days.",
        source="Dermatologist Advice"
    ),
    ConflictRule(
        ingredient_a="RETINOL",
        ingredient_a_aliases=["Tretinoin", "Adapalene", "Retinyl Palmitate"],
        ingredient_b="VITAMIN C",
        ingredient_b_aliases=["L-Ascorbic Acid", "Ascorbic Acid"],
        risk_level=RiskLevel.ADVICE,
        interaction_type="timing",
        reasoning="Both are powerful actives that work best at different pH levels.",
        recommended_adjustment="Vitamin C in AM, Retinol in PM for optimal results.",
        source="Dermatologist Consensus"
    ),
    ConflictRule(
        ingredient_a="NIACINAMIDE",
        ingredient_a_aliases=["Vitamin B3", "Nicotinamide"],
        ingredient_b="GLYCOLIC ACID",
        ingredient_b_aliases=["AHA", "Alpha Hydroxy Acid"],
        risk_level=RiskLevel.ADVICE,
        interaction_type="flushing",
        reasoning="May cause temporary flushing at high concentrations.",
        recommended_adjustment="Apply AHA first, wait 15 minutes, then apply Niacinamide.",
        source="Paula's Choice"
    ),
    ConflictRule(
        ingredient_a="EUK-134",
        ingredient_a_aliases=["EUK"],
        ingredient_b="VITAMIN C",
        ingredient_b_aliases=["L-Ascorbic Acid", "Ascorbic Acid"],
        risk_level=RiskLevel.WARNING,
        interaction_type="instability",
        reasoning="EUK can reduce Vitamin C stability.",
        recommended_adjustment="Use at different times of day.",
        source="The Ordinary"
    ),
    ConflictRule(
        ingredient_a="AZELAIC ACID",
        ingredient_a_aliases=["Azelaic"],
        ingredient_b="RETINOL",
        ingredient_b_aliases=["Tretinoin", "Retinyl Palmitate"],
        risk_level=RiskLevel.ADVICE,
        interaction_type="sensitivity",
        reasoning="May increase sensitivity when used together.",
        recommended_adjustment="Introduce slowly; consider alternate day use.",
        source="Dermatologist Advice"
    ),
    ConflictRule(
        ingredient_a="PHYSICAL SCRUB",
        ingredient_a_aliases=["Scrub", "Exfoliant Beads", "Walnut Shell"],
        ingredient_b="GLYCOLIC ACID",
        ingredient_b_aliases=["AHA", "Chemical Exfoliant"],
        risk_level=RiskLevel.WARNING,
        interaction_type="over-exfoliation",
        reasoning="Physical + chemical exfoliation risks micro-tears and barrier damage.",
        recommended_adjustment="Never use on the same day. Choose one method per session.",
        source="AAD Guidelines"
    ),
    ConflictRule(
        ingredient_a="RETINOL",
        ingredient_a_aliases=["Tretinoin", "Adapalene"],
        ingredient_b="WAXING",
        ingredient_b_aliases=["Wax", "Hair Removal Wax"],
        risk_level=RiskLevel.WARNING,
        interaction_type="skin_lifting",
        reasoning="Retinoids thin the skin barrier; waxing can cause skin lifting.",
        recommended_adjustment="Stop retinoid use 5-7 days before waxing.",
        source="Esthetician Guidelines"
    ),
]


def normalize_ingredient(ingredient: str) -> str:
    """Normalize ingredient name for matching."""
    return ingredient.strip().upper()


def check_ingredient_match(ingredient: str, rule_ingredient: str, aliases: List[str]) -> bool:
    """Check if an ingredient matches a rule ingredient or any of its aliases."""
    normalized = normalize_ingredient(ingredient)
    if normalized == rule_ingredient.upper():
        return True
    for alias in aliases:
        if alias.upper() in normalized or normalized in alias.upper():
            return True
    return False


def check_routine_conflicts(
    product_ingredients: List[str],
    routine_ingredients: List[str]
) -> List[Dict]:
    """
    Check for conflicts between a product's ingredients and existing routine ingredients.
    
    Args:
        product_ingredients: INCI list of the product being added
        routine_ingredients: Combined INCI lists of all products in the routine
    
    Returns:
        List of conflict dictionaries with risk level, reasoning, and recommendations
    """
    conflicts = []
    
    for rule in CONFLICT_RULES:
        # Check if product has ingredient A and routine has ingredient B
        product_has_a = any(
            check_ingredient_match(ing, rule.ingredient_a, rule.ingredient_a_aliases)
            for ing in product_ingredients
        )
        routine_has_b = any(
            check_ingredient_match(ing, rule.ingredient_b, rule.ingredient_b_aliases)
            for ing in routine_ingredients
        )
        
        if product_has_a and routine_has_b:
            conflicts.append({
                "risk_level": rule.risk_level.value,
                "ingredient_a": rule.ingredient_a,
                "ingredient_b": rule.ingredient_b,
                "interaction_type": rule.interaction_type,
                "reasoning": rule.reasoning,
                "recommended_adjustment": rule.recommended_adjustment,
                "source": rule.source
            })
            continue
        
        # Also check the reverse (product has B, routine has A)
        product_has_b = any(
            check_ingredient_match(ing, rule.ingredient_b, rule.ingredient_b_aliases)
            for ing in product_ingredients
        )
        routine_has_a = any(
            check_ingredient_match(ing, rule.ingredient_a, rule.ingredient_a_aliases)
            for ing in routine_ingredients
        )
        
        if product_has_b and routine_has_a:
            conflicts.append({
                "risk_level": rule.risk_level.value,
                "ingredient_a": rule.ingredient_b,  # Swap for clarity
                "ingredient_b": rule.ingredient_a,
                "interaction_type": rule.interaction_type,
                "reasoning": rule.reasoning,
                "recommended_adjustment": rule.recommended_adjustment,
                "source": rule.source
            })
    
    # Sort by risk level (CRITICAL first)
    risk_order = {"CRITICAL": 0, "WARNING": 1, "ADVICE": 2}
    conflicts.sort(key=lambda x: risk_order.get(x["risk_level"], 3))
    
    return conflicts
