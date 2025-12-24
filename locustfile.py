from locust import HttpUser, task, between, constant_pacing

class SkincareUser(HttpUser):
    # Wait between 1 and 3 seconds between tasks
    wait_time = between(1, 3)

    @task(1)
    def health_check(self):
        """Cheap ping to keep connection open"""
        self.client.get("/health")

    @task(3)
    def chat_search_product(self):
        """Simulate a product search - expensive DB hit"""
        # We assume BYOK, but for load testing we might mock the auth or just test the 422 path 
        # to stress networking stack if we don't have a valid key.
        # However, to test pgvector, we really need to hit the DB layer.
        # Since we don't have a Google Key for the test runner, we will Mock the Endpoint 
        # OR we will stress the /health endpoint to proves Nginx/Uvicorn concurrency first.
        
        # Real Load Test Strategy without Paid API Key:
        # We can't hit the real LLM without paying. 
        # So for this test, let's just hammer the /health and /auth endpoints to verify 
        # Uvicorn worker throughput, which validates the Container/Network layer.
        
        self.client.post("/auth/google", json={"id_token": "mock_token_for_load_test"})
