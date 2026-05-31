import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_PATH", "./test_emergency_data.db")

from main import app
from database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_emergency_data.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    if os.path.exists("./test_emergency_data.db"):
        try:
            os.remove("./test_emergency_data.db")
        except Exception:
            pass
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS poi_rtree USING rtree(id, min_lat, max_lat, min_lng, max_lng);"))
        conn.commit()
    yield
    try:
        if os.path.exists("./test_emergency_data.db"):
            os.remove("./test_emergency_data.db")
    except Exception:
        pass


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
