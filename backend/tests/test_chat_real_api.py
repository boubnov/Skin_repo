"""
Integration Tests for Chat System using REAL API Keys.
This suite connects to the actual Gemini/Marketplace API and the local database.
WARNING: This consumes API credits.

Run with:
    export OPENAI_API_KEY="sk-..."
    export OPENAI_BASE_URL="https://api.marketplace.novo-genai.com/v1"
    pytest tests/test_chat_real_api.py -v -s
"""

import pytest
import os
import sys
import json
from langchain_core.messages import HumanMessage, SystemMessage

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agent import SkincareAgent
from app.database import SessionLocal
from app.models import Product

# Check if API keys are present
HAS_REAL_KEYS = os.getenv("OPENAI_API_KEY") is not None and os.getenv("OPENAI_BASE_URL") is not None

@pytest.mark.skipif(not HAS_REAL_KEYS, reason="Skipping real API tests: OPENAI_API_KEY or OPENAI_BASE_URL not set")
class TestRealChatIntegration:
    
    @pytest.fixture(scope="class")
    def db(self):
        """Use the real database session for this test suite."""
        session = SessionLocal()
        yield session
        session.close()

    @pytest.fixture(scope="class")
    def agent(self, db):
        """Initialize the SkincareAgent with the real LLM."""
        openai_api_key = os.getenv("OPENAI_API_KEY")
        openai_base_url = os.getenv("OPENAI_BASE_URL")
        openai_model = os.getenv("OPENAI_MODEL", "gemini_3_pro")

        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model=openai_model,
            api_key=openai_api_key,
            base_url=openai_base_url,
            temperature=0,
        )
        return SkincareAgent(llm=llm, db_session=db)

    def test_llm_connection_and_tool_selection(self, agent):
        """
        Verify the LLM can:
        1. Receive a query requiring a product search.
        2. Correctly decide to call the 'product_retriever' tool.
        """
        print("\n[TEST] Sending query: 'Find me a moisturizing cream for dry skin'")
        
        # We invoke the agent directly to inspect tool calls without full streaming loop
        # The agent.llm_with_tools.invoke() returns an AIMessage that may contain tool_calls
        
        response = agent.llm_with_tools.invoke([
            SystemMessage(content=agent.build_system_context(user_id=1)), # Assuming user 1 exists or context handles it
            HumanMessage(content="Find me a moisturizing cream for dry skin")
        ])
        
        print(f"[TEST] LLM Response Type: {type(response)}")
        print(f"[TEST] Tool Calls: {response.tool_calls}")

        # Assert correct tool was selected
        assert hasattr(response, 'tool_calls'), "Response should have tool_calls attribute"
        assert len(response.tool_calls) > 0, "LLM should have called a tool"
        assert response.tool_calls[0]['name'] == 'product_retriever', "LLM should have selected 'product_retriever'"
        
        # Verify args
        args = response.tool_calls[0]['args']
        assert 'query' in args, "Tool call should have a 'query' argument"
        print(f"[TEST] Tool Args: {args}")

    def test_full_rag_flow(self, agent, db):
        """
        Verify the full loop:
        LLM -> Tool Call -> RAG Search -> Database Result -> LLM response
        """
        query = "Do you have any products by Glow Recipe?"
        print(f"\n[TEST] Testing full RAG flow with query: '{query}'")
        
        # We'll use the run_stream method which handles the tool execution
        # collecting the generator results
        
        chunks = []
        products_found = []
        
        stream = agent.run_stream(user_message=query, user_id=None)
        
        print("[TEST] Streaming response...")
        for chunk in stream:
            # Parse NDJSON chunk
            if isinstance(chunk, str):
                try:
                    data = json.loads(chunk.strip())
                    chunks.append(data)
                    
                    if data["type"] == "products":
                        products_found.extend(data["content"])
                    elif data["type"] == "text":
                        print(data["content"], end="", flush=True)
                except json.JSONDecodeError:
                    print(f"[WARN] Failed to parse chunk: {chunk}")
            else:
                 # Should not happen given agent.py impl, but good for robustness
                 print(f"[WARN] Received non-string chunk: {chunk}")

        print("\n\n[TEST] Stream finished.")
        
        # Verification
        assert len(products_found) > 0, "Should have found Glow Recipe products"
        first_product = products_found[0]
        assert "Glow Recipe" in first_product["brand"], "First product should be from Glow Recipe"
        print(f"[TEST] Found {len(products_found)} products. First one: {first_product['name']}")

    def test_obscure_product_retrieval(self, agent):
        """
        Test the specific 'obscure' product query we verified manually earlier.
        """
        query = "Tell me about Dewy Babies by Glow Recipe"
        print(f"\n[TEST] Specific Product Query: '{query}'")
        
        chunks = []
        products_found = []
        
        stream = agent.run_stream(user_message=query, user_id=None)
        
        for chunk in stream:
            if isinstance(chunk, str):
                try:
                    data = json.loads(chunk.strip())
                    chunks.append(data)
                    
                    if data["type"] == "products":
                        products_found.extend(data["content"])
                    elif data["type"] == "text":
                        print(data["content"], end="", flush=True)
                except json.JSONDecodeError:
                    pass
                
        print("\n")
        
        # If products are returned, verify them
        if products_found:
             assert any("Dewy Babies" in p['name'] for p in products_found), "Should return the Dewy Babies product data"
        else:
            # If no structured products, check text mentioning details
            print("[TEST] No structured product data returned, checking text content for specific details...")
            full_text = "".join([c["content"] for c in chunks if c["type"] == "text"])
            assert "Glow Recipe" in full_text
            assert "kit" in full_text.lower() or "set" in full_text.lower(), "Should describe it as a kit/set"
