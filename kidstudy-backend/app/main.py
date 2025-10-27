from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="KidStudy API", version="0.3.0")

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
    if not payload.topic:
        raise HTTPException(status_code=400, detail="Topic required")
    topic = payload.topic
    answers = [
        f"{topic} helps students understand key ideas.",
        f"{topic} can be explored through real-world examples.",
        f"Learning about {topic} encourages curiosity and creativity.",
        f"{topic} supports science and literacy development.",
        f"{topic} helps students connect classroom learning to daily life.",
    ]
    return [{"front_text": f"Q{i+1}: {topic}", "back_text": a} for i, a in enumerate(answers)]
