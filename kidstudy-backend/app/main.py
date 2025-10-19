from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="KidStudy API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    """Generate simple example flashcards based on a topic."""
    if not payload.topic:
        raise HTTPException(status_code=400, detail="Topic required")

    topic = payload.topic
    answers = [
        f"{topic} helps students understand key ideas.",
        f"{topic} can be explored using examples and discussions.",
        f"Learning about {topic} improves understanding in science and reading.",
        f"{topic} encourages curiosity and critical thinking.",
        f"Teachers can use {topic} to make lessons more interactive."
    ]

    return [
        {"front_text": f"What is {topic}?", "back_text": answers[0]},
        {"front_text": f"Why is {topic} important?", "back_text": answers[1]},
        {"front_text": f"How can we study {topic}?", "back_text": answers[2]},
        {"front_text": f"What do we learn from {topic}?", "back_text": answers[3]},
        {"front_text": f"How can {topic} be used in class?", "back_text": answers[4]},
    ]
