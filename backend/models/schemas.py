from pydantic import BaseModel, Field
from typing import List, Optional, Union


class POIBase(BaseModel):
    name: str
    type: str
    lat: float
    lng: float
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    source: Optional[str] = None


class POIResponse(POIBase):
    id: Union[int, str]
    distance_km: float


class SOSRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    # Support both old (user_phone/emergency_contacts) and new (contacts) field names
    user_phone: Optional[str] = None
    emergency_contacts: Optional[List[str]] = Field(default_factory=list)
    contacts: Optional[List[str]] = Field(default_factory=list)


class SOSResponse(BaseModel):
    nearest_hospital: Optional[POIResponse] = None
    nearest_police: Optional[POIResponse] = None
    nearest_ambulance: Optional[dict] = None
    sms_body: str


class ChatRequest(BaseModel):
    message: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    session_id: str


class ChatAction(BaseModel):
    label: str
    tel: str


class ChatResponse(BaseModel):
    reply: str
    intents: List[str]
    priority: Optional[str] = "normal"
    actions: Optional[List[ChatAction]] = None


class CacheRegionRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = None
    min_lat: Optional[float] = None
    min_lng: Optional[float] = None
    max_lat: Optional[float] = None
    max_lng: Optional[float] = None


class TTSRequest(BaseModel):
    text: str
    lang: str = "en"
