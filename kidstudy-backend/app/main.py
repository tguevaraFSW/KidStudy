import os, json, re, asyncio
from typing import List, Optional, Literal
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import httpx

load_dotenv()

app = FastAPI(title="KidStudy AI API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Models ----------------
class Flashcard(BaseModel):
    front_text: str = Field(..., description="Question/prompt for the student")
    back_text: str  = Field(..., description="Kid-friendly answer/explanation")

class PromptRequest(BaseModel):
    topic: str
    grade_band: Optional[Literal["K-2","3-5","6-8","9-12"]] = "3-5"
    count: Optional[int] = 10

# -------------- Provider setup --------------
PROVIDER = (os.getenv("PROVIDER") or "ollama").lower()

# Ollama
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct")

# OpenAI
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL    = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = (
    "You are KidStudy, a K–12 teaching assistant. "
    "Create high-quality flashcards for kids. Be accurate, concise, and age-appropriate."
)

def build_user_prompt(topic: str, grade_band: str, count: int) -> str:
    return f"""
Create {count} K–12 flashcards about: "{topic}".

Audience grade band: {grade_band}.
Writing style: simple, clear sentences. No jargon. Avoid overly generic answers.
Mix of card types (but keep each as Q on front, A on back):
- 1 definition card
- 2–4 factual Q/A (What/Why/How)
- 1 fill-in-the-blank
- 1 true/false (put the correct explanation on the back)
- 1 short real-life example
- 1 misconception correction
- Remaining: concise practice prompts

CRITICAL OUTPUT FORMAT:
Return ONLY a valid JSON object like:
{{
  "cards": [
    {{ "front_text": "Question here", "back_text": "Answer here" }}
  ]
}}

Rules:
- Each `front_text` must be a real question or prompt a child could answer.
- Each `back_text` must be specific and helpful (1–3 short sentences).
- Keep vocabulary appropriate for {grade_band}.
"""

JSON_RE = re.compile(r"\{.*\}", re.S)

async def call_ollama(topic: str, grade: str, count: int) -> List[Flashcard]:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(topic, grade, count)},
        ],
        "stream": False,
        "options": {"temperature": 0.4}
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
        r.raise_for_status()
        content = r.json()["message"]["content"]
    return parse_cards_json(content)

async def call_openai(topic: str, grade: str, count: int) -> List[Flashcard]:
    # Using the OpenAI Chat Completions REST endpoint via httpx
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    body = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(topic, grade, count)},
        ],
        "temperature": 0.4
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post("https://api.openai.com/v1/chat/completions", json=body, headers=headers)
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
    return parse_cards_json(content)

def parse_cards_json(text: str) -> List[Flashcard]:
    """
    Extract a JSON object from the model response and validate.
    If parsing fails, raise HTTPException so the client sees a useful error.
    """
    # Try direct parse first
    try:
        obj = json.loads(text)
    except Exception:
        # Try to extract first JSON-looking block
        m = JSON_RE.search(text)
        if not m:
            raise HTTPException(status_code=502, detail="Model did not return JSON.")
        try:
            obj = json.loads(m.group(0))
        except Exception:
            raise HTTPException(status_code=502, detail="Could not parse model JSON.")

    if not isinstance(obj, dict) or "cards" not in obj or not isinstance(obj["cards"], list):
        raise HTTPException(status_code=502, detail="JSON format missing 'cards' list.")

    cards: List[Flashcard] = []
    for item in obj["cards"]:
        ft = (item.get("front_text") or "").strip()
        bt = (item.get("back_text") or "").strip()
        if ft and bt:
            cards.append(Flashcard(front_text=ft, back_text=bt))
    if not cards:
        raise HTTPException(status_code=502, detail="No valid cards produced by model.")
    # Cap at 12 for UI sanity
    return cards[:12]

# --------------- Routes ---------------
@app.get("/health")
def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat(), "provider": PROVIDER}

@app.post("/api/prompt", response_model=List[Flashcard])
async def generate(p: PromptRequest):
    topic = (p.topic or "").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    count = max(6, min(12, p.count or 10))
    grade = p.grade_band or "3-5"

    if PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
        cards = await call_openai(topic, grade, count)
    else:
        # default: ollama
        cards = await call_ollama(topic, grade, count)

    return [c.dict() for c in cards]
