from fastapi import FastAPI
from database import init_db
from routers import geo, sos, chat, tts
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="RoadSoS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(geo.router, prefix="/api")
app.include_router(sos.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(tts.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "db_last_refreshed": "2026-05-31T15:00:00Z"}
