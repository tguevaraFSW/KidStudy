# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import json, re, requests

# --- OLLAMA CONFIG ---------------------------------------------------------
OLLAMA_URL = "http://127.0.0.1:11434"  # Ollama server base URL
MODEL = "llama3.1:8b-instruct"          # Change if you use a different model

# --- FASTAPI APP -----------------------------------------------------------
app = FastAPI(title="KidStudy Backend", version="1.0")

# Allow frontend on localhost:5173 to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ----------------------------------------------------------------
class Card(BaseModel):
    front_text: str = Field(..., min_length=2)
    back_text: str = Field(..., min_length=1)

class PromptRequest(BaseModel):
    topic: str
    grade_band: str = "3-5"  # "K-2", "3-5", "6-8", "9-12"
    count: int = 8

# --- HELPERS ---------------------------------------------------------------
def _parse_json_loose(txt: str):
    """Extract valid JSON even if model adds extra text."""
    try:
        return json.loads(txt)
    except Exception:
        pass
    m = re.search(r'(\{.*\}|\[.*\])', txt, flags=re.S)
    if m:
        return json.loads(m.group(1))
    raise ValueError("Could not parse JSON from model output")

def call_ollama_json(prompt: str) -> dict:
    """Try /api/generate first, then /api/chat if missing."""
    # 1️⃣ Try /api/generate
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.4},
            },
            timeout=60,
        )
        if r.status_code == 200:
            txt = r.json().get("response", "").strip()
            return _parse_json_loose(txt)
        elif r.status_code != 404:
            r.raise_for_status()
    except Exception:
        pass  # move on to /api/chat

    # 2️⃣ Try /api/chat
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": MODEL,
                "stream": False,
                "messages": [
                    {"role": "system", "content": "Return JSON ONLY."},
                    {"role": "user", "content": prompt},
                ],
                "options": {"temperature": 0.4},
            },
            timeout=60,
        )
        r.raise_for_status()
        txt = r.json().get("message", {}).get("content", "").strip()
        return _parse_json_loose(txt)
    except Exception as e:
        raise RuntimeError(f"Ollama call failed: {e}")

def normalize(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip().casefold()

def dedupe(cards: List[Card]) -> List[Card]:
    seen, out = set(), []
    for c in cards:
        key = (normalize(c.front_text), normalize(c.back_text))
        if key not in seen:
            seen.add(key)
            out.append(c)
    return out

def fallback_cards(topic: str, grade_band: str, needed: int) -> List[Card]:
    """Fallback flashcards when Ollama fails."""
    if grade_band in ("K-2", "3-5"):
        base = [
            ("What is one fact about {topic}?", "A simple fact about {topic}."),
            ("Why is {topic} important?", "It helps us understand the world."),
            ("Give an example related to {topic}.", "A basic example about {topic}."),
            ("True or False: {topic} is used in daily life.", "True!"),
            ("What is something we can learn from {topic}?", "A kid-friendly idea."),
        ]
    else:
        base = [
            ("Define {topic}.", "A clear definition of {topic}."),
            ("Give a real-world example of {topic}.", "One example of {topic}."),
            ("Why does {topic} matter?", "Because it’s useful or important."),
            ("Compare {topic} to something else.", "A short comparison."),
            ("Name one key term about {topic}.", "Give its meaning."),
        ]
    cards = []
    for i in range(needed):
        q, a = base[i % len(base)]
        cards.append(Card(front_text=q.format(topic=topic), back_text=a.format(topic=topic)))
    return cards

def ensure_count(topic: str, grade_band: str, cards: List[Card], n: int) -> List[Card]:
    cards = dedupe(cards)
    if len(cards) > n:
        return cards[:n]
    if len(cards) < n:
        cards += fallback_cards(topic, grade_band, n - len(cards))
    return cards

# --- ROUTES ----------------------------------------------------------------
@app.get("/")
def root():
    return {"ok": True, "service": "kidstudy-backend"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/api/prompt", response_model=List[Card])
def generate_cards(req: PromptRequest):
    """Generate study flashcards with AI, fallback to local."""
    n = max(1, min(24, req.count))
    target = min(2 * n, 40)

    system_prompt = (
        "You are generating K–12 study flashcards. "
        "Return JSON ONLY with the shape: "
        "{ \"cards\": [ {\"front_text\":\"...\",\"back_text\":\"...\"}, ... ] }. "
        f"Produce {target} unique flashcards about {req.topic}. "
        "Do not include explanations or prose outside JSON."
    )

    try:
        raw = call_ollama_json(system_prompt)
        items = raw.get("cards") if isinstance(raw, dict) else raw
        cards = []
        if isinstance(items, list):
            for x in items:
                try:
                    cards.append(Card(
                        front_text=str(x.get("front_text", "")).strip(),
                        back_text=str(x.get("back_text", "")).strip(),
                    ))
                except Exception:
                    continue
        final_cards = ensure_count(req.topic, req.grade_band, cards, n)
        return final_cards
    except Exception as e:
        # Ollama failed, fallback
        print(f"⚠️ Model error: {e}")
        return fallback_cards(req.topic, req.grade_band, n)
