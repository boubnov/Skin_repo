from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.tools import tool
from typing import List, Dict
from sqlalchemy.orm import Session
from . import rag
import json
from .tools.store_locator import store_locator

# Define Tools
def create_tools(db: Session):
    
    @tool
    def product_retriever(query: str, skin_type: str = "all") -> str:
        """
        Search for skincare products using Hybrid Search (Vector + Keyword).
        Returns a JSON list of products.
        Args:
            query: The search query (e.g., "moisturizer for acne").
            skin_type: User's skin type to filter by (e.g., "oily", "dry", "all").
        """
        filters = {}
        if skin_type and skin_type != "all":
            filters["skin_type"] = skin_type
            
        results = rag.hybrid_search(db, query, filters=filters, limit=3)
        
        if not results:
            return "[]"
            
        # Format results as JSON for the LLM and Frontend
        product_list = []
        for p in results:
            # Generate Affiliate Link (Amazon Search Fallback)
            # In a real app, this would be a specific ASIN link from a database
            affiliate_tag = "skinairecs-20"
            encoded_name = p.name.replace(" ", "+")
            affiliate_url = f"https://www.amazon.com/s?k={encoded_name}&tag={affiliate_tag}"
            
            # Enrich metadata
            metadata = p.metadata_info or {}
            metadata["affiliate_url"] = affiliate_url
            
            product_list.append({
                "name": p.name,
                "brand": p.brand,
                "description": p.description,
                "metadata": metadata
            })
        return json.dumps(product_list)

    @tool
    def ingredient_checker(ingredients: str, allergy: str) -> str:
        """
        Checks if a list of ingredients contains a specific allergen.
        Args:
            ingredients: Comma-separated list of ingredients.
            allergy: The allergen to check for (e.g., "peanuts").
        """
        # Simple string check for now (Case insensitive)
        if allergy.lower() in ingredients.lower():
            return f"WARNING: Contains {allergy}!"
        return "Safe."

    return [product_retriever, ingredient_checker, store_locator]

class SkincareAgent:
    def __init__(self, llm, db_session: Session):
        self.db = db_session
        self.tools = create_tools(db_session)
        self.llm = llm
        self.llm_with_tools = self.llm.bind_tools(self.tools)

    def run_stream(self, user_message: str, chat_history: List[Dict] = [], user_location: str = None, image_base64: str = None):
        """
        Runs the agent loop and YIELDS chunks of the final text.
        Structure of yield:
        { "type": "text", "content": "..." }
        { "type": "products", "content": [...] }
        """
        system_text = "You are a helpful, safety-conscious Dermatology Assistant. Use 'product_retriever' to find products. Use 'store_locator' if the user asks where to buy something. ALWAYS check for allergies. Be concise."
        
        # Add image analysis instructions if image is provided
        if image_base64:
            system_text += " The user has provided an image for skin analysis. Carefully examine the image and provide relevant skincare advice based on what you observe."
        
        if user_location:
            system_text += f" User Location: {user_location}. Use this for store_locator queries."
            
        messages = [
            SystemMessage(content=system_text)
        ]
        
        # Add History
        for msg in chat_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        
        # Create user message with optional image
        if image_base64:
            # Create multimodal message with image
            # Strip data URI prefix if present
            image_data = image_base64
            if image_base64.startswith("data:"):
                # Extract base64 part after comma
                image_data = image_base64.split(",")[1] if "," in image_base64 else image_base64
            
            messages.append(HumanMessage(content=[
                {"type": "text", "text": user_message or "Please analyze this skin image and provide advice."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
            ]))
        else:
            messages.append(HumanMessage(content=user_message))
        
        # 1. First Call (Synchronous Decision)
        # We don't stream here because we need to know if it wants to use tools first.
        response = self.llm_with_tools.invoke(messages)
        
        found_products = []

        if response.tool_calls:
            # 2. Execute Tools
            messages.append(response) # Add the intent to call tool
            for tool_call in response.tool_calls:
                function_name = tool_call["name"]
                args = tool_call["args"]
                
                # Find matching tool
                tool_result = "Error: Tool not found"
                if function_name == "product_retriever":
                    tool = self.tools[0]
                    tool_result = tool.invoke(args)
                    
                    # Capture Products!
                    try:
                        products = json.loads(tool_result)
                        if isinstance(products, list):
                            found_products.extend(products)
                    except:
                        pass 

                elif function_name == "ingredient_checker":
                    tool = self.tools[1]
                    tool_result = tool.invoke(args)

                elif function_name == "store_locator":
                    # Tool index 2
                    tool = self.tools[2] 
                    tool_result = tool.invoke(args)
                
                from langchain_core.messages import ToolMessage
                messages.append(ToolMessage(tool_call_id=tool_call["id"], content=str(tool_result)))
            
            # Yield Products first if we have them
            if found_products:
                 yield json.dumps({"type": "products", "content": found_products}) + "\n"

            # 3. Second Call (Streamed Synthesis)
            for chunk in self.llm_with_tools.stream(messages):
                # Check for injected products (Mock or otherwise)
                if hasattr(chunk, "additional_kwargs") and "products" in chunk.additional_kwargs:
                     yield json.dumps({"type": "products", "content": chunk.additional_kwargs["products"]}) + "\n"
                     
                if chunk.content:
                    yield json.dumps({"type": "text", "content": chunk.content}) + "\n"
            
        else:
            # No tool call, just stream the content from the first response? 
            # Actually response.content has the full text already if we used invoke.
            # To be consistent, we can just yield it as one chunk, OR RE-RUN stream.
            # But invoking twice is wasteful.
            # If response.content is populated, just yield it.
            if response.content:
                yield json.dumps({"type": "text", "content": response.content}) + "\n"

