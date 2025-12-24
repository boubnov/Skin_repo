from langchain.tools import tool
import json
import random

@tool
def store_locator(query: str) -> str:
    """
    Useful for finding where to buy a product in physical stores.
    Input: A query like "Where can I buy CeraVe in San Francisco?" or just "CeraVe".
    Output: A list of nearby stores with stock status.
    """
    print(f"[StoreLocator] Searching for: {query}")
    
    # Mock Data to simulate Google Places API
    stores = [
        {"name": "Sephora", "location": "Market St", "distance": "0.5 miles", "in_stock": True},
        {"name": "Target", "location": "Metreon", "distance": "0.8 miles", "in_stock": True},
        {"name": "Walgreens", "location": "Powell St", "distance": "0.2 miles", "in_stock": False},
        {"name": "Ulta Beauty", "location": "Division St", "distance": "1.5 miles", "in_stock": True}
    ]
    
    # Randomly shuffle or filter based on query to make it feel alive?
    # For now, just return the list.
    
    return json.dumps(stores)
