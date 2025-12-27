from scrapers.multi_store_scraper import MultiStoreScraper

# 1. Simulate SEPHORA HTML (with specific data-at tags)
sephora_html = """
<html>
<body>
    <div class="css-12345">
        <h1 class="css-0" data-at="product_name">Tatcha The Dewy Skin Cream</h1>
        <a data-at="brand_name" href="/brand/tatcha">Tatcha</a>
        <div class="css-1oz9qb">$72.00</div>
    </div>
</body>
</html>
"""

# 2. Simulate AMAZON HTML (with span IDs)
amazon_html = """
<html>
<body>
    <div id="centerCol">
        <span id="productTitle" class="a-size-large">
            CeraVe Moisturizing Cream | Body and Face Moisturizer for Dry Skin
        </span>
        <span class="a-offscreen">$19.99</span>
    </div>
</body>
</html>
"""

# 3. Simulate DERMSTORE HTML
dermstore_html = """
<html>
<body>
    <div class="product-details">
        <h1 class="productName">SkinCeuticals C E Ferulic</h1>
        <h2 class="productBrand">SkinCeuticals</h2>
    </div>
</body>
</html>
"""

def test_extraction_logic():
    scraper = MultiStoreScraper()
    
    print("\n🧪 TESTING SEPHORA PARSING...")
    res1 = scraper.parse_product_html(sephora_html, "sephora.com")
    print(f"   Name: {res1.get('name')}")
    print(f"   Brand: {res1.get('brand')}")
    print(f"   Price: {res1.get('price')}")
    assert res1['name'] == "Tatcha The Dewy Skin Cream"
    
    print("\n🧪 TESTING AMAZON PARSING...")
    res2 = scraper.parse_product_html(amazon_html, "amazon.com")
    print(f"   Name: {res2.get('name')}")
    print(f"   Price: {res2.get('price')}")
    assert "CeraVe" in res2['name']
    
    print("\n🧪 TESTING DERMSTORE PARSING...")
    res3 = scraper.parse_product_html(dermstore_html, "dermstore.com")
    print(f"   Name: {res3.get('name')}")
    print(f"   Brand: {res3.get('brand')}")
    assert res3['name'] == "SkinCeuticals C E Ferulic"
    
    print("\n✅ SUCCESS: All scraping logic verified against HTML structure.")

if __name__ == "__main__":
    test_extraction_logic()
