# Tests for Safety Guard Conflict Engine
import pytest
from app.services.conflict_rules import (
    check_routine_conflicts,
    check_ingredient_match,
    normalize_ingredient,
    RiskLevel
)


class TestNormalization:
    """Test ingredient normalization."""
    
    def test_normalize_basic(self):
        assert normalize_ingredient("retinol") == "RETINOL"
        assert normalize_ingredient("  Vitamin C  ") == "VITAMIN C"
        assert normalize_ingredient("Glycolic Acid") == "GLYCOLIC ACID"


class TestIngredientMatching:
    """Test fuzzy ingredient matching logic."""
    
    def test_exact_match(self):
        assert check_ingredient_match("RETINOL", "RETINOL", []) is True
        assert check_ingredient_match("retinol", "RETINOL", []) is True
    
    def test_alias_match(self):
        aliases = ["Tretinoin", "Adapalene", "Retinyl Palmitate"]
        assert check_ingredient_match("Tretinoin", "RETINOL", aliases) is True
        assert check_ingredient_match("adapalene", "RETINOL", aliases) is True
    
    def test_partial_alias_match(self):
        aliases = ["Vitamin C", "Ascorbic Acid"]
        assert check_ingredient_match("L-Ascorbic Acid", "L-ASCORBIC ACID", aliases) is True
    
    def test_no_match(self):
        aliases = ["Tretinoin", "Adapalene"]
        assert check_ingredient_match("Niacinamide", "RETINOL", aliases) is False


class TestConflictDetection:
    """Test the core conflict detection logic."""
    
    def test_retinol_aha_critical_conflict(self):
        """Retinol + AHA should trigger CRITICAL conflict."""
        product_ingredients = ["Retinol", "Water", "Glycerin"]
        routine_ingredients = ["Glycolic Acid", "Water", "Aloe"]
        
        conflicts = check_routine_conflicts(product_ingredients, routine_ingredients)
        
        assert len(conflicts) >= 1
        assert conflicts[0]["risk_level"] == "CRITICAL"
        assert "retinol" in conflicts[0]["ingredient_a"].lower() or "retinol" in conflicts[0]["ingredient_b"].lower()
    
    def test_vitamin_c_benzoyl_peroxide_critical(self):
        """Vitamin C + Benzoyl Peroxide should trigger CRITICAL conflict."""
        product_ingredients = ["L-Ascorbic Acid", "Ferulic Acid", "Vitamin E"]
        routine_ingredients = ["Benzoyl Peroxide", "Water"]
        
        conflicts = check_routine_conflicts(product_ingredients, routine_ingredients)
        
        assert len(conflicts) >= 1
        assert any(c["risk_level"] == "CRITICAL" for c in conflicts)
    
    def test_vitamin_c_niacinamide_warning(self):
        """Vitamin C + Niacinamide should trigger WARNING (debated conflict)."""
        product_ingredients = ["Vitamin C", "Water"]
        routine_ingredients = ["Niacinamide", "Hyaluronic Acid"]
        
        conflicts = check_routine_conflicts(product_ingredients, routine_ingredients)
        
        assert len(conflicts) >= 1
        assert any(c["risk_level"] == "WARNING" for c in conflicts)
    
    def test_no_conflict_safe_ingredients(self):
        """Safe ingredients should not trigger conflicts."""
        product_ingredients = ["Hyaluronic Acid", "Water", "Glycerin"]
        routine_ingredients = ["Ceramides", "Aloe Vera", "Squalane"]
        
        conflicts = check_routine_conflicts(product_ingredients, routine_ingredients)
        
        assert len(conflicts) == 0
    
    def test_aha_bha_warning(self):
        """AHA + BHA should trigger WARNING (over-exfoliation)."""
        product_ingredients = ["Glycolic Acid", "Water"]
        routine_ingredients = ["Salicylic Acid", "Tea Tree"]
        
        conflicts = check_routine_conflicts(product_ingredients, routine_ingredients)
        
        assert len(conflicts) >= 1
        assert any(c["interaction_type"] == "over-exfoliation" for c in conflicts)
    
    def test_retinol_vitamin_c_advice(self):
        """Retinol + Vitamin C should trigger ADVICE (timing recommendation)."""
        product_ingredients = ["Retinol", "Peptides"]
        routine_ingredients = ["Vitamin C", "Ferulic Acid"]
        
        conflicts = check_routine_conflicts(product_ingredients, routine_ingredients)
        
        assert len(conflicts) >= 1
        # Should have at least an ADVICE level conflict
        assert any(c["risk_level"] in ["ADVICE", "WARNING", "CRITICAL"] for c in conflicts)
    
    def test_conflicts_sorted_by_severity(self):
        """Conflicts should be sorted with CRITICAL first."""
        # A routine with multiple conflict types
        product_ingredients = ["Retinol", "Vitamin C"]
        routine_ingredients = ["Glycolic Acid", "Niacinamide"]
        
        conflicts = check_routine_conflicts(product_ingredients, routine_ingredients)
        
        if len(conflicts) > 1:
            risk_levels = [c["risk_level"] for c in conflicts]
            # Check CRITICAL comes before WARNING, WARNING before ADVICE
            if "CRITICAL" in risk_levels and "WARNING" in risk_levels:
                assert risk_levels.index("CRITICAL") < risk_levels.index("WARNING")


class TestReverseConflictDetection:
    """Test that conflicts are detected regardless of which product has which ingredient."""
    
    def test_reverse_detection(self):
        """Conflict should be detected when ingredients are in opposite products."""
        # Product A has ingredient, Routine has conflicting ingredient
        conflicts_a = check_routine_conflicts(
            ["Glycolic Acid"], 
            ["Retinol"]
        )
        
        # Product B has conflicting ingredient, Routine has original
        conflicts_b = check_routine_conflicts(
            ["Retinol"], 
            ["Glycolic Acid"]
        )
        
        # Both should detect the conflict
        assert len(conflicts_a) >= 1
        assert len(conflicts_b) >= 1
        assert conflicts_a[0]["risk_level"] == "CRITICAL"
        assert conflicts_b[0]["risk_level"] == "CRITICAL"
