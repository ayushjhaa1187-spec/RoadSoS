import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

# Mock data for LLM responses
def mock_llm_response(*args, **kwargs):
    # This works for both Gemini and OpenAI style mocks in our tests
    mock_response = MagicMock()
    
    # Extract prompt text from various possible argument positions
    prompt = ""
    if "messages" in kwargs:
        prompt = kwargs["messages"][-1]["content"]
    elif args:
        prompt = str(args[0])
    
    # Simple rule-based mock for tests
    if "Classify" in str(prompt):
        import re
        match = re.search(r'Message:\s*"([^"]+)"', str(prompt))
        user_msg = match.group(1).lower() if match else str(prompt).lower()
        
        if "police" in user_msg or "robbed" in user_msg:
            text = '{"intent": "find_police", "language": "English", "urgency": "high"}'
        elif "ambulance" in user_msg:
            text = '{"intent": "find_ambulance", "language": "English", "urgency": "high"}'
        elif "fuel" in user_msg:
            text = '{"intent": "find_fuel", "language": "English", "urgency": "low"}'
        elif "tow" in user_msg or "breakdown" in user_msg:
            text = '{"intent": "find_towing", "language": "English", "urgency": "low"}'
        elif "accident" in user_msg:
            text = '{"intent": "report_accident", "language": "English", "urgency": "high"}'
        elif "bleeding" in user_msg or "help" in user_msg:
            text = '{"intent": "emergency_sos", "language": "English", "urgency": "high"}'
        elif "अस्पताल" in user_msg or "hospital" in user_msg:
            text = '{"intent": "find_hospital", "language": "English", "urgency": "medium"}'
        elif "மருத்துவமனை" in user_msg:
            text = '{"intent": "find_hospital", "language": "Tamil", "urgency": "medium"}'
        else:
            text = '{"intent": "general_query", "language": "English", "urgency": "low"}'
    else:
        text = "This is a mocked RAG response."

    # Handle OpenAI style response object
    if "messages" in kwargs:
        mock_choice = MagicMock()
        mock_choice.message.content = text
        mock_response.choices = [mock_choice]
    else:
        # Handle Gemini style
        mock_response.text = text
        
    return mock_response

@pytest.fixture(autouse=True)
def mock_llms():
    from services.chatbot import sessions
    sessions.clear()
    with patch("google.generativeai.GenerativeModel.generate_content", side_effect=mock_llm_response), \
         patch("openai.resources.chat.completions.Completions.create", side_effect=mock_llm_response):
        yield

def test_chat_find_hospital():
    response = client.post("/api/chat", json={"message": "Where is the nearest hospital?", "session_id": "123"})
    assert response.status_code == 200
    assert "find_hospital" in response.json()["intents"]

def test_chat_find_police():
    response = client.post("/api/chat", json={"message": "I was robbed, call police", "session_id": "123"})
    assert response.status_code == 200
    assert "find_police" in response.json()["intents"]

def test_chat_find_ambulance():
    response = client.post("/api/chat", json={"message": "Send an ambulance", "session_id": "123"})
    assert response.status_code == 200
    assert "find_ambulance" in response.json()["intents"]

def test_chat_find_fuel():
    response = client.post("/api/chat", json={"message": "I need fuel", "session_id": "123"})
    assert response.status_code == 200
    assert "find_fuel" in response.json()["intents"]

def test_chat_find_towing():
    response = client.post("/api/chat", json={"message": "My car needs a tow", "session_id": "123"})
    assert response.status_code == 200
    assert "find_towing" in response.json()["intents"]

def test_chat_report_accident():
    response = client.post("/api/chat", json={"message": "I see an accident", "session_id": "123"})
    assert response.status_code == 200
    assert "report_accident" in response.json()["intents"]

def test_chat_emergency_sos():
    response = client.post("/api/chat", json={"message": "Help me, I am bleeding", "session_id": "123"})
    assert response.status_code == 200
    assert "emergency_sos" in response.json()["intents"]
    # Check safety layer
    assert "FIRST AID" in response.json()["reply"] or "Ambulance:" in response.json()["reply"]

def test_chat_general_query():
    response = client.post("/api/chat", json={"message": "What is the speed limit here?", "session_id": "123"})
    assert response.status_code == 200
    assert "general_query" in response.json()["intents"]

def test_chat_hindi_language():
    response = client.post("/api/chat", json={"message": "पास का अस्पताल कहाँ है?", "session_id": "123"})
    assert response.status_code == 200
    assert "find_hospital" in response.json()["intents"]

def test_chat_tamil_language():
    response = client.post("/api/chat", json={"message": "அருகில் உள்ள மருத்துவமனை எங்கே?", "session_id": "123"})
    assert response.status_code == 200
    assert "find_hospital" in response.json()["intents"]
