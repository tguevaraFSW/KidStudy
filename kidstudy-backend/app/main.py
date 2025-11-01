from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

app = FastAPI(title="KidStudy API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Database Setup (SQLite for now) ----------
DATABASE_URL = "sqlite:///kidstudy.db"
Base = declarative_base()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

class FlashcardModel(Base):
    __tablename__ = "flashcards"
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String)
    question = Column(String)
    answer = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ---------- Pydantic Models ----------
class Flashcard(BaseModel):
    front_text: str
    back_text: str

class PromptRequest(BaseModel):
    topic: str
    grade: Optional[str] = None

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/prompt", response_model=List[Flashcard])
def generate_flashcards(payload: PromptRequest):
    if not payload.topic:
        raise HTTPException(status_code=400, detail="Topic required")

    topic = payload.topic
    answers = [
        f"{topic} helps students understand key ideas.",
        f"{topic} can be explored using examples and discussions.",
        f"Learning about {topic} improves understanding in science and reading.",
        f"{topic} encourages curiosity and critical thinking.",
        f"Teachers can use {topic} to make lessons more interactive.",
    ]
    flashcards = [{"front_text": f"What is {topic}?", "back_text": a} for a in answers]

    db = SessionLocal()
    for c in flashcards:
        db_card = FlashcardModel(topic=topic, question=c["front_text"], answer=c["back_text"])
        db.add(db_card)
    db.commit()
    db.close()

    return flashcards
