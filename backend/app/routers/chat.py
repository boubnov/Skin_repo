from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from .. import database
from ..agent import SkincareAgent
import os

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    user_location: Optional[str] = None
    image_base64: Optional[str] = None  # Base64 encoded image for vision analysis

from ..dependencies import get_current_user
from .. import models

@router.post("/")
def chat_endpoint(
    request: ChatRequest, 
    x_goog_api_key: str = Header(None, alias="X-Goog-Api-Key"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Chat endpoint for the Skincare Agent.
    Supports:
    - Google Generative AI (X-Goog-Api-Key header)
    - OpenAI-compatible APIs (OPENAI_API_KEY + OPENAI_BASE_URL env vars)
    - Mock for testing (key starting with 'mock_')
    """
    try:
        # Check for OpenAI-compatible API first (env vars)
        openai_api_key = os.getenv("OPENAI_API_KEY")
        openai_base_url = os.getenv("OPENAI_BASE_URL")
        openai_model = os.getenv("OPENAI_MODEL", "gemini_3_pro")
        
        if openai_api_key and openai_base_url:
            # Use OpenAI-compatible endpoint (e.g., novo-genai marketplace)
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model=openai_model,
                api_key=openai_api_key,
                base_url=openai_base_url,
                temperature=0,
            )
        elif x_goog_api_key:
            if x_goog_api_key.startswith("mock_"):
                # Local Mock LLM for Integration Tests
                class MockLLM:
                    def __init__(self, key):
                        self.key = key

                    def bind_tools(self, tools):
                        return self
                    
                    def invoke(self, messages):
                        from langchain_core.messages import AIMessage, SystemMessage
                        input_text = messages[-1].content.lower()
                        
                        # DEBUG HOOK: Return System Prompt Content for Verification
                        if "context_check" in input_text:
                            system_content = "No System Message Found"
                            if isinstance(messages[0], SystemMessage):
                                system_content = messages[0].content
                            return AIMessage(content=f"DEBUG_CONTEXT:{system_content}")
                        
                        if "buy" in input_text or "find" in input_text or "want" in input_text:
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
                        from langchain_core.messages import AIMessageChunk, SystemMessage
                        
                        last_msg = messages[-1]
                        input_text = last_msg.content.lower()
                        
                        # DEBUG HOOK STREAMING
                        if "context_check" in input_text:
                             system_content = "No System Message Found"
                             if isinstance(messages[0], SystemMessage):
                                system_content = messages[0].content
                             yield AIMessageChunk(content=f"DEBUG_CONTEXT:{system_content}")
                             return

                        if hasattr(last_msg, "tool_call_id"):
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
        else:
            raise HTTPException(status_code=400, detail="Missing API key. Provide X-Goog-Api-Key header or set OPENAI_API_KEY env var.")

        # Initialize Agent with Injected LLM
        agent = SkincareAgent(llm=llm, db_session=db)
        
        # Run Stream
        return StreamingResponse(
            agent.run_stream(
                request.message, 
                [h.dict() for h in request.history], 
                user_location=request.user_location,
                image_base64=request.image_base64,
                user_id=current_user.id
            ),
            media_type="application/x-ndjson"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
