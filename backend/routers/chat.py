from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from services.chatbot import process_message

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    try:
        result = process_message(request.message, request.lat, request.lng, request.session_id)
        return ChatResponse(**result)
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error in chatbot")
