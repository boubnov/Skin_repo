"""
LangGraph Guardian Orchestrator - Agentic RAG with Safety Gate

This module implements a state-driven DAG orchestrator that:
1. Retrieves user context (allergies, skin type, negative log)
2. Searches for products using hybrid RAG
3. Runs Safety Guard checks (Tier 1 Rule-Based + Tier 2 LLM)
4. BLOCKS store/purchase recommendations if CRITICAL risk is detected
5. Synthesizes final response with streaming support
"""

from typing import TypedDict, Annotated, List, Dict, Optional, Literal
import operator
import json
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from sqlalchemy.orm import Session

from . import models
from . import rag
from .services.conflict_rules import check_routine_conflicts, RiskLevel


# ============================================================================
# STATE DEFINITION (The "Backpack")
# ============================================================================

class AgentState(TypedDict):
    """
    The state that flows through the entire agent execution graph.
    Each node reads from and writes to specific keys.
    """
    # Input
    user_query: str
    user_id: int
    user_location: Optional[str]
    
    # Context from ContextManager
    user_context: Dict  # skin_type, allergies, blacklist, shelf_ingredients
    
    # Products from ProductRetriever
    candidate_products: List[Dict]
    
    # Safety payload from SafetyGuard
    safety_payload: Dict  # { "risk_level": str, "conflicts": list, "blocked": bool }
    
    # Store results (only if not blocked)
    store_results: List[Dict]
    
    # Message history for LLM
    messages: Annotated[List[BaseMessage], operator.add]
    
    # Final output
    final_response: str
    response_chunks: List[str]  # For streaming


# ============================================================================
# NODE IMPLEMENTATIONS
# ============================================================================

def node_get_context(state: AgentState, db: Session) -> Dict:
    """
    ContextManager Node: Fetches user's profile, allergies, and shelf ingredients.
    This MUST run before any product search to set constraints.
    """
    user_id = state["user_id"]
    
    # 1. Fetch Profile
    user = db.query(models.User).filter(models.User.id == user_id).first()
    profile_data = {}
    if user and user.profile:
        p = user.profile
        profile_data = {
            "name": p.name or "User",
            "skin_type": p.skin_type or "unknown",
            "concerns": p.concerns or "",
            "allergies": []  # Would come from medical history table
        }
    
    # 2. Fetch Active Shelf Products + Their Ingredients
    products = db.query(models.UserProduct).filter(
        models.UserProduct.user_id == user_id,
        models.UserProduct.status == 'active'
    ).all()
    
    shelf_products = []
    shelf_ingredients = []
    for p in products:
        shelf_products.append({
            "name": p.product_name,
            "brand": p.brand,
            "category": p.category
        })
        # Extract ingredients from notes (temporary until dedicated column)
        if p.notes and p.notes.startswith("Ingredients:"):
            ingredients = p.notes.replace("Ingredients:", "").strip().split(", ")
            shelf_ingredients.extend(ingredients)
    
    # 3. Fetch Negative Log (Products that failed)
    # This would be used for inverse deduction of ingredients to avoid
    blacklist_ingredients = []
    # TODO: Query from product_history or journal for failed products
    
    return {
        "user_context": {
            **profile_data,
            "shelf_products": shelf_products,
            "shelf_ingredients": list(set(shelf_ingredients)),
            "blacklist_ingredients": blacklist_ingredients
        }
    }


def node_retrieve_products(state: AgentState, db: Session, llm) -> Dict:
    """
    ProductRetriever Node: Uses hybrid search with skin_type filter.
    Appends evidence grading to each product.
    """
    query = state["user_query"]
    skin_type = state["user_context"].get("skin_type", "all")
    
    filters = {}
    if skin_type and skin_type != "unknown":
        filters["skin_type"] = skin_type
    
    results = rag.hybrid_search(db, query, filters=filters, limit=5)
    
    if not results:
        return {"candidate_products": []}
    
    products = []
    for p in results:
        # Parse metadata
        raw_meta = p.metadata_info
        if isinstance(raw_meta, str):
            try:
                metadata = json.loads(raw_meta)
            except (json.JSONDecodeError, TypeError):
                metadata = {}
        else:
            metadata = raw_meta or {}
        
        # Evidence Grading based on source
        # 🟢 Clinical Trial, 🟡 Dermatologist Consensus, 🔴 Anecdotal
        evidence_grade = "🟡"  # Default to consensus
        if "clinical" in str(p.description).lower():
            evidence_grade = "🟢"
        elif "review" in str(metadata).lower():
            evidence_grade = "🔴"
        
        # Extract ingredients for safety checking
        ingredients = []
        if hasattr(p, 'ingredients_text') and p.ingredients_text:
            ingredients = [i.strip() for i in p.ingredients_text.split(",")]
        
        products.append({
            "id": p.id,
            "name": p.name,
            "brand": p.brand,
            "description": p.description,
            "ingredients": ingredients,
            "evidence_grade": evidence_grade,
            "metadata": metadata
        })
    
    return {"candidate_products": products}


def node_safety_gate(state: AgentState, db: Session, llm) -> Dict:
    """
    SafetyGuard Node: The Guardian.
    
    Tier 1: Deterministic rule-based checks (fast, <300ms)
    Tier 2: LLM analysis for complex formulations (if Tier 1 passes)
    
    Returns risk_level: CRITICAL | WARNING | ADVICE | SAFE
    """
    candidate_products = state.get("candidate_products", [])
    shelf_ingredients = state.get("user_context", {}).get("shelf_ingredients", [])
    
    all_conflicts = []
    highest_risk = "SAFE"
    
    for product in candidate_products:
        product_ingredients = product.get("ingredients", [])
        
        if not product_ingredients:
            continue
        
        # TIER 1: Rule-Based Checks
        conflicts = check_routine_conflicts(product_ingredients, shelf_ingredients)
        
        for conflict in conflicts:
            conflict["product_name"] = product["name"]
            all_conflicts.append(conflict)
            
            # Track highest risk level
            if conflict["risk_level"] == "CRITICAL":
                highest_risk = "CRITICAL"
            elif conflict["risk_level"] == "WARNING" and highest_risk != "CRITICAL":
                highest_risk = "WARNING"
            elif conflict["risk_level"] == "ADVICE" and highest_risk == "SAFE":
                highest_risk = "ADVICE"
    
    # TIER 2: LLM Analysis (only if Tier 1 didn't find CRITICAL)
    # This would analyze complex interactions not in the rule database
    if highest_risk != "CRITICAL" and candidate_products:
        # TODO: Implement LLM-based INCI analysis for edge cases
        pass
    
    return {
        "safety_payload": {
            "risk_level": highest_risk,
            "conflicts": all_conflicts,
            "blocked": highest_risk == "CRITICAL"
        }
    }


def node_store_locator(state: AgentState) -> Dict:
    """
    StoreLocator Node: Only runs if SafetyGuard allows.
    Uses Google Places API to find nearby stores.
    """
    from .tools.store_locator import store_locator
    
    user_location = state.get("user_location", "")
    products = state.get("candidate_products", [])
    
    if not products or not user_location:
        return {"store_results": []}
    
    # Search for first product
    product_name = products[0]["name"]
    query = f"{product_name} skincare store"
    
    try:
        result = store_locator.invoke({"query": query, "location": user_location})
        stores = json.loads(result) if isinstance(result, str) else result
        return {"store_results": stores if isinstance(stores, list) else []}
    except Exception:
        return {"store_results": []}


def node_synthesis_warning(state: AgentState, llm) -> Dict:
    """
    Synthesis Node (BLOCKED): Generates a safety warning response.
    """
    conflicts = state.get("safety_payload", {}).get("conflicts", [])
    
    warning_text = "⚠️ **SAFETY ALERT**: I cannot recommend this product because it conflicts with items in your routine.\n\n"
    
    for conflict in conflicts:
        if conflict["risk_level"] == "CRITICAL":
            warning_text += f"🔴 **{conflict['ingredient_a']}** + **{conflict['ingredient_b']}**: {conflict['reasoning']}\n"
            warning_text += f"   → {conflict['recommended_adjustment']}\n\n"
    
    warning_text += "Please consult a dermatologist before using these products together."
    
    return {
        "final_response": warning_text,
        "response_chunks": [warning_text]
    }


def node_synthesis_response(state: AgentState, llm) -> Dict:
    """
    Synthesis Node (ALLOWED): Generates the final helpful response.
    Streams tokens for real-time UX.
    """
    products = state.get("candidate_products", [])
    safety = state.get("safety_payload", {})
    stores = state.get("store_results", [])
    context = state.get("user_context", {})
    query = state.get("user_query", "")
    
    # Build prompt with all context
    prompt = f"""Based on the user's query: "{query}"

User Profile: {context.get('skin_type', 'unknown')} skin
Current Shelf: {', '.join([p['name'] for p in context.get('shelf_products', [])])}

Found Products:
"""
    for p in products[:3]:
        prompt += f"- {p['name']} by {p['brand']} {p['evidence_grade']}\n"
    
    if safety.get("conflicts"):
        prompt += "\n⚠️ Note these warnings:\n"
        for c in safety["conflicts"]:
            prompt += f"- {c['ingredient_a']} + {c['ingredient_b']}: {c['recommended_adjustment']}\n"
    
    if stores:
        prompt += f"\nNearby stores: {stores[0].get('name', 'Available locally')}\n"
    
    prompt += "\nProvide a helpful, personalized recommendation."
    
    # Generate response
    messages = [
        SystemMessage(content="You are a dermatology consultant. Be specific and reference the user's actual products."),
        HumanMessage(content=prompt)
    ]
    
    response = llm.invoke(messages)
    final_text = response.content if hasattr(response, 'content') else str(response)
    
    return {
        "final_response": final_text,
        "response_chunks": [final_text]
    }


# ============================================================================
# GUARDIAN ROUTER (Conditional Edges)
# ============================================================================

def safety_guard_router(state: AgentState) -> Literal["blocked", "store", "synthesis"]:
    """
    The Guardian: Routes based on safety check results.
    
    CRITICAL → blocked (cannot proceed)
    User wants location → store → synthesis
    Otherwise → synthesis
    """
    risk = state.get("safety_payload", {}).get("risk_level", "SAFE")
    query = state.get("user_query", "").lower()
    
    # GUARDIAN LOGIC: Block if CRITICAL
    if risk == "CRITICAL":
        return "blocked"
    
    # Check if user wants store/buying info
    location_keywords = ["buy", "near me", "store", "where", "purchase", "get"]
    if any(keyword in query for keyword in location_keywords):
        return "store"
    
    return "synthesis"


# ============================================================================
# GRAPH BUILDER
# ============================================================================

def create_guardian_graph(db: Session, llm):
    """
    Creates the LangGraph DAG with Guardian safety gate.
    
    Flow:
    START → get_context → retrieve_products → safety_gate
          ↓
    [CRITICAL] → synthesis_warning → END
    [SAFE + location] → store_locator → synthesis → END
    [SAFE] → synthesis → END
    """
    
    # Create node wrappers that inject db and llm
    def context_node(state):
        return node_get_context(state, db)
    
    def retrieve_node(state):
        return node_retrieve_products(state, db, llm)
    
    def safety_node(state):
        return node_safety_gate(state, db, llm)
    
    def store_node(state):
        return node_store_locator(state)
    
    def warning_node(state):
        return node_synthesis_warning(state, llm)
    
    def response_node(state):
        return node_synthesis_response(state, llm)
    
    # Build graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("get_context", context_node)
    workflow.add_node("retrieve_products", retrieve_node)
    workflow.add_node("safety_gate", safety_node)
    workflow.add_node("store_locator", store_node)
    workflow.add_node("synthesis_warning", warning_node)
    workflow.add_node("synthesis_response", response_node)
    
    # Define edges
    workflow.set_entry_point("get_context")
    workflow.add_edge("get_context", "retrieve_products")
    workflow.add_edge("retrieve_products", "safety_gate")
    
    # Conditional edge from safety_gate (THE GUARDIAN)
    workflow.add_conditional_edges(
        "safety_gate",
        safety_guard_router,
        {
            "blocked": "synthesis_warning",
            "store": "store_locator",
            "synthesis": "synthesis_response"
        }
    )
    
    workflow.add_edge("store_locator", "synthesis_response")
    workflow.add_edge("synthesis_warning", END)
    workflow.add_edge("synthesis_response", END)
    
    return workflow.compile()


# ============================================================================
# AGENT CLASS (Public Interface)
# ============================================================================

class GuardianAgent:
    """
    The Guardian Agent - A safety-first LangGraph orchestrator.
    """
    
    def __init__(self, llm, db_session: Session):
        self.db = db_session
        self.llm = llm
        self.graph = create_guardian_graph(db_session, llm)
    
    def run(self, user_query: str, user_id: int, user_location: str = None) -> Dict:
        """
        Execute the full agent loop.
        Returns the final state with response and safety info.
        """
        initial_state = {
            "user_query": user_query,
            "user_id": user_id,
            "user_location": user_location,
            "user_context": {},
            "candidate_products": [],
            "safety_payload": {},
            "store_results": [],
            "messages": [],
            "final_response": "",
            "response_chunks": []
        }
        
        final_state = self.graph.invoke(initial_state)
        return final_state
    
    def run_stream(self, user_query: str, user_id: int, user_location: str = None):
        """
        Stream execution for real-time UX.
        Yields JSON chunks for frontend consumption.
        """
        import json
        
        initial_state = {
            "user_query": user_query,
            "user_id": user_id,
            "user_location": user_location,
            "user_context": {},
            "candidate_products": [],
            "safety_payload": {},
            "store_results": [],
            "messages": [],
            "final_response": "",
            "response_chunks": []
        }
        
        # Stream through graph
        for event in self.graph.stream(initial_state):
            node_name = list(event.keys())[0]
            node_output = event[node_name]
            
            # Yield safety alerts immediately
            if "safety_payload" in node_output:
                payload = node_output["safety_payload"]
                if payload.get("blocked"):
                    yield json.dumps({
                        "type": "safety_alert",
                        "risk_level": payload["risk_level"],
                        "conflicts": payload["conflicts"]
                    }) + "\n"
            
            # Yield products when found
            if "candidate_products" in node_output:
                products = node_output["candidate_products"]
                if products:
                    yield json.dumps({
                        "type": "products",
                        "content": products
                    }) + "\n"
            
            # Yield final response
            if "final_response" in node_output:
                yield json.dumps({
                    "type": "text",
                    "content": node_output["final_response"]
                }) + "\n"
