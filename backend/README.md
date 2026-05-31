# RoadSoS Backend

FastAPI backend for emergency response.

## Setup

1.  **Environment Variables:**
    *   **Backend (`backend/.env`):**
        *   `GEMINI_API_KEY`: For the AI chatbot.
        *   `GOOGLE_PLACES_KEY`: For geocoding (locality) and places discovery.
    *   **Frontend (`roadsos-web/.env.local`):**
        *   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: For rendering the Google Map.

2.  **Run Backend:**
    ```bash
    cd backend
    pip install -r requirements.txt
    python main.py
    ```

3.  **Run Frontend:**
    ```bash
    cd roadsos-web
    npm install
    npm run dev
    ```

## Testing

Run tests with pytest:
```bash
pytest tests/
```

## Endpoints

- `GET /nearest`: Find closest hospitals, police, etc.
- `POST /sos`: Get emergency payload and SMS body.
- `POST /chat`: AI triage with Gemini 2.0 Flash.
- `GET /chat/tts`: Convert text to speech.
- `POST /chat/stt`: Convert speech to text (mocked).
- `POST /cache-region`: Fetch data for offline caching.

## Examples

### Chat
```bash
curl -X POST http://localhost:8000/chat \
-H "Content-Type: application/json" \
-d '{"message": "I need an ambulance quickly", "lat": 12.9716, "lng": 77.5946, "session_id": "123"}'
```

### TTS
```bash
curl -X GET "http://localhost:8000/chat/tts?text=Help%20is%20on%20the%20way&lang=en" --output response.mp3
```
