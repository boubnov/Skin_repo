import pytest
from app import models

@pytest.fixture
def mock_id_token():
    return "mock_token_inventory_test"

def test_inventory_flow(module_client, db_session, mock_id_token):
    # 1. Login/Create User
    # We must exchange the ID token for an Access Token first
    login_res = module_client.post("/auth/google", json={"id_token": mock_id_token, "tos_agreed": True})
    assert login_res.status_code == 200
    access_token = login_res.json()["access_token"]
    login_headers = {"Authorization": f"Bearer {access_token}"}
    
    # 2. Add Product to Shelf (Inventory)
    payload = {
        "product_name": "CeraVe Hydrating Cleanser",
        "brand": "CeraVe",
        "category": "Cleanser",
        "status": "active"
    }
    res = module_client.post("/products/", json=payload, headers=login_headers)
    assert res.status_code == 200
    product_data = res.json()
    assert product_data["product_name"] == "CeraVe Hydrating Cleanser"
    product_id = product_data["id"]

    # 3. Verify it shows in list
    res = module_client.get("/products/", headers=login_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1
    
    # 4. Link to Routine
    # First get routine to find an item ID
    res = module_client.get("/routine/", headers=login_headers)
    routine = res.json()
    am_items = routine["am"]
    target_item_id = am_items[0]["id"]
    
    # Link the product to this item
    update_payload = {"user_product_id": product_id}
    res = module_client.put(f"/routine/item/{target_item_id}", json=update_payload, headers=login_headers)
    assert res.status_code == 200
    updated_item = res.json()
    assert updated_item["user_product_id"] == product_id
    assert updated_item["product_details"]["name"] == "CeraVe Hydrating Cleanser"
    
    # 5. Verify Routine Response reflects the link
    res = module_client.get("/routine/", headers=login_headers)
    routine_v2 = res.json()
    # Check if the name updated or if product_details are present
    # The API logic returns `item.user_product.product_name if item.user_product else item.name`
    # So the name should now be "CeraVe Hydrating Cleanser" instead of "Cleanser"
    target_item_v2 = next(i for i in routine_v2["am"] if i["id"] == target_item_id)
    assert target_item_v2["name"] == "CeraVe Hydrating Cleanser"
    assert target_item_v2["user_product_id"] == product_id

def test_add_missing_endpoint():
    # Placeholder to remind us to fix the API
    assert True
