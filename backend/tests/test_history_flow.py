def test_history_flow(client):
    """
    Verifies the full history flow: Login -> Add Item -> Verify in List.
    Adapted from verify_history.py.
    """
    # 1. Login using Dev Bypass
    login_payload = {"id_token": "mock_token_hist_test", "tos_agreed": True}
    res_login = client.post("/auth/google", json=login_payload)
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Add Product (Unsafe)
    payload = {
        "product_name": "Bad Cream",
        "brand": "Generic Brand",
        "status": "unsafe",
        "notes": "Caused massive breakout"
    }
    res_post = client.post("/history/", json=payload, headers=headers)
    assert res_post.status_code == 200
    data = res_post.json()
    assert data["product_name"] == "Bad Cream"
    assert data["status"] == "unsafe"
    
    # 3. Fetch History and Verify
    res_get = client.get("/history/", headers=headers)
    assert res_get.status_code == 200
    logs = res_get.json()
    
    found = False
    for item in logs:
        if item["product_name"] == "Bad Cream" and item["status"] == "unsafe":
            found = True
            break
            
    assert found, "Created history item not found in list"
