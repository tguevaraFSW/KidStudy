# KidStudy Backend (Rebuild Week)

This week’s progress:
- Rebuilt environment after machine failure
- Created a minimal FastAPI app
- Added a `/health` endpoint for verification
- CORS enabled for future frontend calls

## Run (dev)
```bash
cd kidstudy-backend
python -m venv .venv
.\.venv\Scripts\Activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
