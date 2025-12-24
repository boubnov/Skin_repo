from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from .. import database
from ..agent import SkincareAgent

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    user_location: Optional[str] = None

@router.post("/")
def chat_endpoint(
    request: ChatRequest, 
    x_goog_api_key: str = Header(..., alias="X-Goog-Api-Key"),
    db: Session = Depends(database.get_db)
):
    """
    Chat endpoint for the Skincare Agent.
    Requires 'X-Goog-Api-Key' header for BYOK (Bring Your Own Key).
    """
    try:
        if not x_goog_api_key:
            raise HTTPException(status_code=400, detail="Missing X-Goog-Api-Key header")
            
        # Factory: Choose LLM (Real vs Mock)
        if x_goog_api_key.startswith("mock_"):
            # Local Mock LLM for Integration Tests
            class MockLLM:
                def __init__(self, key):
                    self.key = key

                def bind_tools(self, tools):
                    return self
                
                def invoke(self, messages):
                    from langchain_core.messages import AIMessage
                    # This mimics the first call (decision)
                    input_text = messages[-1].content.lower()
                    
                    if "buy" in input_text or "find" in input_text or "want" in input_text:
                        # Extract potential product name (very naive)
                        # Assume last word or "eltamd"
                        query = "skincare"
                        if "eltamd" in input_text: query = "EltaMD"
                        elif "cerave" in input_text: query = "CeraVe"
                        
                        return AIMessage(
                            content="",
                            tool_calls=[{
                                "name": "product_retriever",
                                "args": {"query": query},
                                "id": "mock_call_rag"
                            }]
                        )
                    return AIMessage(content="I can help you find products. Try saying 'I want EltaMD'.")

                def stream(self, messages):
                    # Mimics the second call (synthesis)
                    from langchain_core.messages import AIMessageChunk
                    
                    # If the last message was a tool result (ToolMessage), we should use it!
                    last_msg = messages[-1]
                    if hasattr(last_msg, "tool_call_id"):
                        # This means we just got data back from RAG
                        import json
                        try:
                            products = json.loads(last_msg.content)
                            if products:
                                yield AIMessageChunk(content=f"I found {len(products)} products related to your search.")
                                yield AIMessageChunk(content="", additional_kwargs={"products": products})
                                return
                        except:
                            pass
                            
                    yield AIMessageChunk(content="I couldn't find any specific products in my database.")
                            
            llm = MockLLM(x_goog_api_key)
        else:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model="gemini-pro",
                google_api_key=x_goog_api_key,
                temperature=0, 
                convert_system_message_to_human=True 
            )

        # Initialize Agent with Injected LLM
        agent = SkincareAgent(llm=llm, db_session=db)
        
        # Run Stream
        return StreamingResponse(
            agent.run_stream(request.message, [h.dict() for h in request.history], user_location=request.user_location),
            media_type="application/x-ndjson"
        )
        
    except Exception as e:
        # In prod, be careful not to leak stack traces
        raise HTTPException(status_code=500, detail=str(e))
