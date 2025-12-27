from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.tools import tool
from typing import List, Dict
from sqlalchemy.orm import Session
from . import rag
from . import models
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
            
            # Enrich metadata - parse from JSON string if needed
            raw_meta = p.metadata_info
            if isinstance(raw_meta, str):
                try:
                    metadata = json.loads(raw_meta)
                except (json.JSONDecodeError, TypeError):
                    metadata = {}
            else:
                metadata = raw_meta or {}
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


    def build_system_context(self, user_id: int) -> str:
        """
        Constructs a Just-in-Time System Prompt tailored to the user's data.
        """
        # 1. Fetch Profile
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        profile_text = "Unknown"
        if user and user.profile:
            p = user.profile
            profile_text = f"Name: {p.name or 'User'}\nSkin Type: {p.skin_type or 'Unknown'}\nConcerns: {p.concerns or 'None'}"
        
        # 2. Fetch Shelf (Active Products)
        products = self.db.query(models.UserProduct).filter(
            models.UserProduct.user_id == user_id,
            models.UserProduct.status == 'active'
        ).all()
        
        shelf_text = "No active products."
        if products:
            shelf_text = "\n".join([f"- {p.product_name} ({p.brand or 'Generic'}) [Category: {p.category or 'N/A'}]" for p in products])
            
        # 3. Fetch Journal (Last 5 Entries)
        entries = self.db.query(models.JournalEntry).filter(
            models.JournalEntry.user_id == user_id
        ).order_by(models.JournalEntry.date.desc()).limit(5).all()
        
        journal_text = "No recent logs."
        if entries:
            journal_text = "\n".join([f"- {e.date.date()}: Condition {e.overall_condition}/5. Notes: {e.notes or 'None'}" for e in entries])

        # 4. Construct XML System Prompt
        # Using Anthropic-style XML tags for clarity
        system_prompt = f"""
<role>
You are a highly personalized Dermatology Consultant. You have access to the user's real-time inventory and skin history.
Your goal is to provide advice that is GROUNDED in their actual situation.
</role>

<user_profile>
{profile_text}
</user_profile>

<inventory>
The user currently owns and uses:
{shelf_text}
</inventory>

<skin_history>
Recent skin journal entries:
{journal_text}
</skin_history>

<instructions>
1. USE THEIR PRODUCTS: If suggesting a routine, prioritize products they already own (listed in <inventory>). Only suggest new products if they are missing a core step (e.g. have no sunscreen).
2. CHECK HISTORY: If they rated their skin poorly (1-3) recently, ask follow-up questions about that specific day/event.
3. BE SPECIFIC: Don't say "use a moisturizer". Say "use your CeraVe Moisturizing Cream".
4. SAFETY: Always check ingredients if they mention allergies.
5. TOOLS: Use 'product_retriever' if you need to find *new* products to recommend. Use 'store_locator' if they ask where to buy.
</instructions>
"""
        return system_prompt

    def run_stream(self, user_message: str, chat_history: List[Dict] = [], user_location: str = None, image_base64: str = None, user_id: int = None):
        """
        Runs the agent loop and YIELDS chunks of the final text.
        Structure of yield:
        { "type": "text", "content": "..." }
        { "type": "products", "content": [...] }
        """
        
        # DYNAMIC CONTEXT BUILDING
        if user_id:
            system_text = self.build_system_context(user_id)
        else:
            system_text = "You are a helpful skin assistant."
        
        # Add image analysis instructions if image is provided
        if image_base64:
            system_text += "\n<image_context>The user provided an image. Analyze it for skin conditions.</image_context>"
        
        if user_location:
            system_text += f"\n<location>{user_location}</location>"
            
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

