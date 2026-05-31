import os
import json
import google.generativeai as genai
from database import query_nearest, SessionLocal
from typing import List, Dict

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_KEY_HERE")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')

# In-memory session store (simple dict)
sessions: Dict[str, List[Dict]] = {}

INTENTS = [
    "find_hospital", "find_police", "find_ambulance",
    "find_fuel", "find_towing", "report_accident",
    "general_query", "emergency_sos"
]

def process_message(user_text: str, lat: float, lng: float, session_id: str):
    # 1. Retrieve history
    history = sessions.get(session_id, [])[-5:]

    # 2. Intent Classification
    intent_prompt = f"""
    Classify the following user message for a road safety app.
    Available intents: {", ".join(INTENTS)}.
    Message: "{user_text}"
    History: {json.dumps(history)}
    Output ONLY valid JSON: {{"intent": "...", "slots": {{"query": "..."}}}}
    """

    try:
        response = model.generate_content(intent_prompt)
        intent_data = json.loads(response.text.strip('` \n').replace('json', ''))
    except:
        intent_data = {"intent": "general_query", "slots": {}}

    intent = intent_data.get("intent", "general_query")

    # 3. Handle data retrieval based on intent
    pois = []
    priority = "normal"
    if intent.startswith("find_") and lat is not None and lng is not None:
        poi_type = intent.replace("find_", "")
        if poi_type == "ambulance":
            poi_type = "ambulance"

        db = SessionLocal()
        try:
            pois = query_nearest(db, lat, lng, poi_type, 20, 3)
        finally:
            db.close()

    # 4. Emergency check
    emergency_keywords = ["bleeding", "crash", "unconscious", "accident", "dying", "help"]
    if intent == "emergency_sos" or any(w in user_text.lower() for w in emergency_keywords):
        priority = "high"

    # 5. Generate final response
    poi_list_str = "\n".join([f"- {p['name']} ({p['distance_km']}km, tel:{p['phone']})" for p in pois])

    response_prompt = f"""
    You are a road safety assistant.
    User message: "{user_text}"
    Nearby {intent}:
    {poi_list_str}

    Provide a helpful, concise response in the user's language.
    Include distances and phone numbers if provided.
    If priority is high, prepend a first-aid tip.
    """

    final_reply = model.generate_content(response_prompt).text

    if priority == "high":
        tip = "FIRST AID TIP: If someone is bleeding, apply firm pressure with a clean cloth. Do not move the injured person unless in immediate danger.\n\n"
        final_reply = tip + final_reply

    # 6. Actions
    actions = []
    for p in pois[:2]:
        if p.get('phone'):
            actions.append({"label": f"Call {p['name']}", "tel": p['phone']})

    # 7. Update history
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": final_reply})
    sessions[session_id] = history

    return {
        "reply": final_reply,
        "priority": priority,
        "actions": actions,
        "intents": [intent]
    }
