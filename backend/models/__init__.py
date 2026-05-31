from sqlalchemy import Column, Integer, String, Float
from database import Base

class Poi(Base):
    __tablename__ = "poi"
    rowid = Column(Integer, primary_key=True, autoincrement=True)
    id = Column(String, unique=True, index=True)
    name = Column(String)
    type = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    phone = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    country = Column(String)
    source = Column(String)
    verified = Column(Integer, default=0)
    last_updated = Column(String)
