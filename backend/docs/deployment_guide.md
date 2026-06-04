# Deployment Guide

## 1. Deployment Modes
This project supports:
- Local development (backend + frontend separately)
- Docker Compose demo deployment
- Production-style container deployment with environment-driven configuration

## 2. Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Example | Purpose |
|---|---|---|---|
| `CLV_PROJECT_ROOT` | Recommended | `.` | Backend root for data/reports/docs/mlruns resolution |
| `API_HOST` | Yes | `0.0.0.0` | FastAPI bind host |
| `API_PORT` | Yes | `8000` | FastAPI bind port |
| `CORS_ORIGINS` | Yes | `http://localhost:5173,http://localhost:3000` | Allowed frontend origins |
| `HIGH_VALUE_QUANTILE` | Optional | `0.8` | Classification threshold quantile |
| `CLV_INPUT_CSV` | Optional | `./data/clv_realistic_50000_5yr_with_agentname.csv` | Default pipeline input path |
| `ENABLE_MLFLOW` | Optional | `true` | Enable MLflow run/metric/model logging |
| `MLFLOW_TRACKING_URI` | Optional | `file://./mlruns` | MLflow tracking backend URI |
| `MLFLOW_EXPERIMENT_NAME` | Optional | `clv_showcase_experiment` | MLflow experiment name |
| `USE_MLFLOW_MODELS` | Optional | `false` | Load inference models from MLflow URIs instead of local PKLs |
| `ENABLE_XGBOOST` | Optional | `false` | Enable optional XGBoost candidates (disabled by default for runtime stability) |

### Frontend (`frontend/.env`)
| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:8000` | Backend API base URL |

## 3. Local Deployment

### 3.1 Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python -m training.run_pipeline --input-csv ./data/clv_realistic_50000_5yr_with_agentname.csv
PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3.2 Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 4. Docker Deployment
From project root:
```bash
docker compose up --build
```

Services:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

## 5. Production Hardening Recommendations
- Restrict `CORS_ORIGINS` to known frontend domains.
- Place backend behind a reverse proxy/API gateway.
- Add authentication/authorization for prediction endpoints.
- Add request logging and centralized log aggregation.
- Add model artifact versioning and immutable release tags.
- Add scheduled retraining with approval workflow.

## 6. Operational Runbook

### 6.1 Train / Retrain
```bash
cd backend
PYTHONPATH=. python -m training.run_pipeline --input-csv ./data/<new_file>.csv --high-value-quantile 0.8
```

### 6.2 Restart API
After retraining, restart backend server to load latest model artifacts.

### 6.3 Verify API
Run:
- `GET /health` -> `model_ready: true`
- `GET /metadata` -> expected model names and threshold
- `GET /model/info` -> clv7-style metadata alias with target formula and selected features
- `GET /business/summary` -> scored portfolio KPI summary
- `GET /mlflow-info` -> run ID and MLflow model URIs
- `GET /model-metrics` -> benchmark metrics available

## 7. Release Validation Checklist
- [ ] Pipeline completes successfully on target data
- [ ] `backend/models/` contains fresh artifacts
- [ ] `backend/reports/metrics/` and `backend/reports/figures/` updated
- [ ] `/predict` and `/upload-csv-and-predict` produce valid output
- [ ] Frontend renders all dashboard sections without API errors
- [ ] Batch upload download flow tested with sample CSV

## 8. Rollback Strategy
If a new model release underperforms:
1. Restore previous model artifacts in `backend/models/`.
2. Restore matching `backend/reports/metrics/model_metrics.json` metadata snapshot.
3. Restart backend and confirm `/metadata` reflects previous model selection.

## 9. Demo Day Readiness
Before stakeholder demo:
- Pre-run pipeline once to ensure warm artifacts
- Keep sample CSV ready in `backend/data/sample_input/upload_sample.csv`
- Open dashboard and validate health/model sections first
- Keep API docs open at `http://localhost:8000/docs` for technical Q&A
