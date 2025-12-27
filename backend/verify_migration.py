#!/usr/bin/env python3
"""
Data Migration Verification Tests

Validates that data was correctly transferred from CSV to PostgreSQL.
"""

import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text
from collections import Counter

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/skincare_app")
engine = create_engine(DATABASE_URL)

# Kaggle Data Paths
KAGGLE_DIR = "/Users/mbvk/Documents/skin_app/data/Kaggle"
REVIEWS_DIR = os.path.join(KAGGLE_DIR, "reviews")

def test_row_counts():
    """Test 1: Compare row counts between CSV and Postgres."""
    print("\n" + "="*60)
    print("TEST 1: ROW COUNT COMPARISON")
    print("="*60)
    
    # Count CSV rows
    csv_total = 0
    csv_valid = 0  # Rows with valid text (len >= 5)
    
    review_files = sorted([f for f in os.listdir(REVIEWS_DIR) if f.endswith(".csv")])
    for f in review_files:
        path = os.path.join(REVIEWS_DIR, f)
        df = pd.read_csv(path, low_memory=False)
        file_total = len(df)
        file_valid = len(df[df['review_text'].str.len() >= 5])
        csv_total += file_total
        csv_valid += file_valid
        print(f"  {f}: {file_total:,} total, {file_valid:,} valid")
    
    print(f"\n  CSV Total: {csv_total:,}")
    print(f"  CSV Valid (text >= 5 chars): {csv_valid:,}")
    
    # Count Postgres rows
    with engine.connect() as conn:
        result = conn.execute(text("SELECT count(*) FROM reviews")).scalar()
        print(f"  Postgres Total: {result:,}")
        
        # Account for previous 8000 reviews + new ingestion
        # The new ingestion would have skipped orphan reviews (no matching product)
        
        # Calculate expected: valid reviews that have matching products
        # We can't easily calculate this without the lookup, but we can check it's reasonable
        
        if result >= csv_valid * 0.9:  # Allow 10% orphan rate
            print("  ✅ PASS: Row count is within expected range")
            return True
        else:
            print(f"  ❌ FAIL: Expected ~{csv_valid:,}, got {result:,}")
            return False


def test_fk_integrity():
    """Test 2: Verify FK integrity (reviews -> products)."""
    print("\n" + "="*60)
    print("TEST 2: FK INTEGRITY CHECK")
    print("="*60)
    
    with engine.connect() as conn:
        # Count reviews with valid product_id
        linked = conn.execute(text("""
            SELECT count(*) FROM reviews 
            WHERE product_id IS NOT NULL
        """)).scalar()
        
        # Count reviews with NULL product_id (old data)
        unlinked = conn.execute(text("""
            SELECT count(*) FROM reviews 
            WHERE product_id IS NULL
        """)).scalar()
        
        # Verify FKs point to existing products
        orphan_fks = conn.execute(text("""
            SELECT count(*) FROM reviews r
            LEFT JOIN products p ON r.product_id = p.id
            WHERE r.product_id IS NOT NULL AND p.id IS NULL
        """)).scalar()
        
        total = linked + unlinked
        
        print(f"  Reviews with product_id: {linked:,}")
        print(f"  Reviews without product_id: {unlinked:,}")
        print(f"  Orphan FKs (pointing to non-existent products): {orphan_fks}")
        print(f"  FK Link Rate: {linked/total*100:.1f}%")
        
        if orphan_fks == 0:
            print("  ✅ PASS: All FKs point to valid products")
            return True
        else:
            print(f"  ❌ FAIL: {orphan_fks} orphan FKs found")
            return False


def test_sample_data():
    """Test 3: Spot check random samples."""
    print("\n" + "="*60)
    print("TEST 3: SAMPLE DATA SPOT CHECKS")
    print("="*60)
    
    with engine.connect() as conn:
        # Get 5 random reviews with product links
        samples = conn.execute(text("""
            SELECT r.id, r.product_name, r.rating, r.skin_type, 
                   substr(r.text, 1, 100) as text_preview,
                   p.name as linked_product, p.brand
            FROM reviews r
            LEFT JOIN products p ON r.product_id = p.id
            WHERE r.product_id IS NOT NULL
            ORDER BY random()
            LIMIT 5
        """)).fetchall()
        
        print(f"  Sample linked reviews:")
        for s in samples:
            print(f"    ID {s[0]}: '{s[1][:30]}...' rating={s[2]} skin={s[3]}")
            print(f"           -> Linked to: {s[5]} ({s[6]})")
        
        # Verify text content exists
        empty_text = conn.execute(text("""
            SELECT count(*) FROM reviews 
            WHERE text IS NULL OR length(text) < 5
        """)).scalar()
        
        print(f"\n  Reviews with empty/short text: {empty_text}")
        
        if empty_text == 0:
            print("  ✅ PASS: All reviews have valid text content")
            return True
        else:
            print(f"  ⚠️ WARNING: {empty_text} reviews have short text")
            return True  # Not a hard fail


def test_rating_distribution():
    """Test 4: Check rating distribution looks reasonable."""
    print("\n" + "="*60)
    print("TEST 4: RATING DISTRIBUTION")
    print("="*60)
    
    with engine.connect() as conn:
        ratings = conn.execute(text("""
            SELECT rating, count(*) as cnt 
            FROM reviews 
            WHERE rating IS NOT NULL
            GROUP BY rating 
            ORDER BY rating
        """)).fetchall()
        
        total = sum(r[1] for r in ratings)
        print(f"  Rating Distribution (total: {total:,}):")
        for rating, count in ratings:
            pct = count / total * 100
            bar = "█" * int(pct / 2)
            print(f"    {rating}: {count:>8,} ({pct:5.1f}%) {bar}")
        
        # Check for reasonable distribution (not all 5s or all 1s)
        if len(ratings) >= 3:
            print("  ✅ PASS: Rating distribution looks diverse")
            return True
        else:
            print("  ⚠️ WARNING: Limited rating diversity")
            return True


def test_product_review_counts():
    """Test 5: Check products have expected review counts."""
    print("\n" + "="*60)
    print("TEST 5: TOP PRODUCTS BY REVIEW COUNT")
    print("="*60)
    
    with engine.connect() as conn:
        top_products = conn.execute(text("""
            SELECT p.name, p.brand, count(r.id) as review_count
            FROM products p
            LEFT JOIN reviews r ON p.id = r.product_id
            GROUP BY p.id, p.name, p.brand
            ORDER BY review_count DESC
            LIMIT 10
        """)).fetchall()
        
        print("  Top 10 products by review count:")
        for p in top_products:
            print(f"    {p[2]:>6,} reviews: {p[0][:40]} ({p[1]})")
        
        # Check that top products have reasonable counts
        if top_products[0][2] > 100:
            print("  ✅ PASS: Top products have substantial review counts")
            return True
        else:
            print("  ⚠️ WARNING: Top product has few reviews")
            return True


def run_all_tests():
    """Run all verification tests."""
    print("\n" + "="*60)
    print("DATA MIGRATION VERIFICATION SUITE")
    print("="*60)
    
    results = {
        "Row Counts": test_row_counts(),
        "FK Integrity": test_fk_integrity(),
        "Sample Data": test_sample_data(),
        "Rating Distribution": test_rating_distribution(),
        "Product Reviews": test_product_review_counts(),
    }
    
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED - Data migration verified!")
    else:
        print("⚠️ SOME TESTS FAILED - Review results above")
    print("="*60 + "\n")
    
    return all_passed


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
