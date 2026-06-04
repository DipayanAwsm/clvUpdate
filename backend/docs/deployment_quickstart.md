# Deployment Quickstart

## Local Dev (recommended for demos)

1. Install prerequisites:
- Python 3.11+
- Node 20+
- Docker (optional)

2. Install dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../frontend
npm install
```

3. Train models with the 50k dataset:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. python -m training.run_pipeline --input-csv ./data/clv_realistic_50000_5yr_with_agentname.csv
```

4. Start backend + frontend:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
cd frontend
VITE_API_BASE_URL=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 5173
```

5. Open:
- Frontend: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`

## Docker Compose

```bash
docker compose up --build
```

Open:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## Azure Container Apps (serverless)

1. Push backend and frontend images to Azure Container Registry.
2. Deploy backend container app:
- ingress external
- target port `8000`
- environment variables from `backend/.env.example` (adjust for production)
3. Deploy frontend container app:
- ingress external
- target port `3000`
- set build arg `VITE_API_BASE_URL` to backend public URL.
4. For persistent artifacts (`models`, `mlruns`, data snapshots), attach Azure Files or migrate to Blob/DB based storage.
   - In this repo, backend-owned paths are `backend/data`, `backend/reports`, `backend/docs`, `backend/mlruns`, and `backend/models`.
