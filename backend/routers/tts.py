from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import TTSRequest
from gtts import gTTS
import io
import hashlib
import os

router = APIRouter()

CACHE_DIR = "tts_cache"
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

@router.post("/tts")
def text_to_speech(request: TTSRequest):
    try:
        # Simple caching based on hash of text and lang
        text_hash = hashlib.md5((request.text + request.lang).encode()).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{text_hash}.mp3")
        
        if os.path.exists(cache_path):
            with open(cache_path, "rb") as f:
                return StreamingResponse(io.BytesIO(f.read()), media_type="audio/mpeg")
        
        tts = gTTS(text=request.text, lang=request.lang)
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        
        # Save to cache
        with open(cache_path, "wb") as f:
            f.write(mp3_fp.getvalue())
        
        mp3_fp.seek(0)
        return StreamingResponse(mp3_fp, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate speech")
