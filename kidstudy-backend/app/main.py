from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(title="KidStudy API", version="0.0.1")

# Open CORS for local dev (frontend will use this later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    """Simple health check to verify the API is running during rebuild week."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# TODO (next week): add POST /api/prompt to return sample flashcards
