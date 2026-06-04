# CLV Enterprise Demo (Simplified Deployable Edition)

Production-ready CLV analytics platform with:
- FastAPI backend (training + inference + dashboard APIs)
- React + Vite frontend (manager-friendly analytics UI)
- ML pipeline (EDA, feature engineering, feature selection, model comparison)
- Batch CSV scoring and downloadable outputs

This version is intentionally simplified for easier deployment and handoff.

## 1. Quick Start (Local)

From project root (`clv_showcase_project`):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python -m training.run_pipeline --input-csv ./data/clv_realistic_50000_5yr_with_agentname.csv
```

Run backend and frontend in two terminals:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 5173
```

Open:
- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`

## 2. Quick Start (Docker)

```bash
docker compose up --build
```

Open:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## 3. Default Input Data

Default training command uses:
- `backend/data/clv_realistic_50000_5yr_with_agentname.csv`

You can train with another file:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. python -m training.run_pipeline --input-csv /absolute/path/to/your_file.csv
```

## 4. How CLV Is Calculated

Primary CLV formula in this project:

`CLV = earned premium - net loss paid`

Column aliases are handled automatically (for example: `earnedpremium_am`, `earned_premium`, `netloss_paid_am`, `net_loss_paid`).

Fallback logic:
- If direct CLV columns/formula cannot be derived, pipeline infers or calibrates a usable CLV target from available behavior/value features and logs assumptions.

## 5. How High-Value Customers Are Found

Binary target generation:
- `high_value_flag = 1` if customer CLV is in the top quantile (default `0.8`, top 20%) on training data
- else `high_value_flag = 0`

Configurable using `HIGH_VALUE_QUANTILE`.

## 6. How Features Are Selected

The pipeline applies multiple methods and uses consensus shortlisting:
1. Correlation with CLV (univariate signal)
2. Mutual information (non-linear dependence)
3. RFECV (recursive elimination with validation)
4. Tree-model feature importance
5. L1/Lasso-based shrinkage

Final selected features are those that repeatedly rank well across methods.

Artifacts:
- `backend/reports/metrics/feature_selection_scores.csv`
- `backend/reports/metrics/feature_selection_summary.json`
- `backend/reports/feature_selection_summary.md`

## 7. Models Trained

### Regression (predict CLV)
- Linear Regression
- Ridge
- Lasso
- Random Forest Regressor
- Gradient Boosting Regressor
- XGBoost Regressor (if available)

### Classification (predict high-value probability/flag)
- Logistic Regression
- Random Forest Classifier
- Gradient Boosting Classifier
- XGBoost Classifier (if available)

Selection is metric-driven on held-out test data.

## 8. Simplified Runtime Structure

```text
clv_showcase_project/
├── backend/
│   ├── app/                 # FastAPI routes, schemas, predictor, config
│   ├── training/            # end-to-end training pipeline modules
│   ├── models/              # saved regressor/classifier/preprocessing/metadata
│   ├── data/                # backend-owned input/output datasets
│   ├── reports/             # backend-generated metrics + figures
│   ├── docs/                # generated assumptions + story docs
│   ├── mlruns/              # MLflow tracking files
│   ├── requirements.txt
│   ├── Dockerfile
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/      # reusable UI components
│   │   ├── pages/           # EDA, model insights, CLTV summary, channel, segmentation, prediction
│   │   ├── hooks/           # live backend + fallback data hooks
│   │   ├── api/             # centralized API client
│   │   └── data/            # mock fallback data
│   ├── package.json
│   ├── Dockerfile
│   └── vite.config.ts
├── docker-compose.yml
├── Makefile
└── README.md
```

## 9. Main Commands (Without Make)

```bash
# Backend setup
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Train
PYTHONPATH=. python -m training.run_pipeline --input-csv ./data/clv_realistic_50000_5yr_with_agentname.csv

# Run API
PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend setup + run
cd ../frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 5173

# Docker
cd ..
docker compose up --build
```

## 10. API Endpoints

- `GET /health` - service status
- `GET /metadata` - selected models, feature list, threshold context
- `GET /model-metrics` - regression/classification metrics
- `GET /eda-summary` - EDA payload for dashboard
- `GET /feature-selection-summary` - feature selection results
- `GET /business/summary` - portfolio KPIs and executive outcomes
- `POST /predict` - single customer scoring
- `POST /predict-batch` - batch scoring with JSON rows
- `POST /upload-csv-and-predict` - CSV upload scoring + preview + download payload

## 11. Deployment Notes

### Local VM / server
1. Install Python 3.11+ and Node 20+
2. Backend install:
   - `cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
3. Train models:
   - `cd backend && source .venv/bin/activate && PYTHONPATH=. python -m training.run_pipeline --input-csv ./data/clv_realistic_50000_5yr_with_agentname.csv`
4. Start backend behind reverse proxy:
   - `cd backend && source .venv/bin/activate && PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8000`
5. Build frontend and serve static assets:
   - `cd frontend && npm install && npm run build`

### Azure serverless (recommended path)
1. Build and push backend + frontend Docker images to ACR
2. Deploy both into Azure Container Apps
3. Set backend env vars (`HIGH_VALUE_QUANTILE`, `ENABLE_MLFLOW`, etc.)
4. Set frontend build arg/env `VITE_API_BASE_URL` to backend public URL
5. Attach Azure Files/Blob strategy for persistent artifacts if needed (`data`, `reports`, `mlruns`, `models`)
   - In this repo these folders are under `backend/` (`backend/data`, `backend/reports`, `backend/mlruns`, `backend/models`).

## 12. Troubleshooting

- UI looks unstyled:
  - `cd frontend && rm -rf node_modules package-lock.json && npm install && npm run dev`
- Backend starts but models missing:
  - Run training once:
    - `cd backend && source .venv/bin/activate && PYTHONPATH=. python -m training.run_pipeline --input-csv ./data/clv_realistic_50000_5yr_with_agentname.csv`
- Wrong input file used:
  - `cd backend && source .venv/bin/activate && PYTHONPATH=. python -m training.run_pipeline --input-csv /absolute/path/file.csv`

## 13. Regeneration Prompt Starter

Use this short prompt to regenerate the project structure/code style:

```text
Build a deployable CLV analytics product with FastAPI backend + React Vite frontend.
Include: EDA, feature engineering (RFM), multi-method feature selection, regression+classification model benchmarking,
SHAP/fallback explainability, /predict and /predict-batch APIs, and manager-ready dashboard storytelling.
Keep modular code and provide Docker + Python/NPM quickstart commands.
```

---

## P&C CLV Formula Integration

This project now uses a visible Property & Casualty (P&C) CLV formula in the backend training pipeline.

### Formula Inputs

The CLV target is calculated with these business inputs:

```text
Premium = directwrittenpremium_am
Expected Claims = expected_claims
Expenses = tax_am + commission_expense_am + service_expense_am
Survival = retention_probability ** year
Discount Rate = discount_rate
Projection Years = projection_years
```

### Full P&C CLV Formula

```text
Annual Profit = directwrittenpremium_am - expected_claims - (tax_am + commission_expense_am + service_expense_am)

P&C CLV = Σ year=1..projection_years
          (Annual Profit × (retention_probability ** year)) / ((1 + discount_rate) ** year)
```

### Where the Formula Is in Code

The formula is implemented in:

```text
backend/training/pnc_clv_engine.py
```

Main function:

```python
calculate_pnc_clv(row)
```

The row-level target is created in:

```python
add_pnc_clv_target(data)
```

That function creates these columns:

```text
expected_claims
service_expense_am
retention_probability
discount_rate
projection_years
pnc_expenses
annual_profit
clv_formula_value
```

### Where It Is Connected to Training

The P&C CLV engine is called from:

```text
backend/training/feature_engineering.py
```

Function:

```python
_derive_insurance_clv_target(data, messages)
```

That function calls:

```python
from training.pnc_clv_engine import add_pnc_clv_target

enriched_data, clv_meta = add_pnc_clv_target(data)
```

Then the training target is assigned as:

```python
data["clv"] = pd.to_numeric(data["clv_formula_value"], errors="coerce").fillna(0.0)
```

### Where Regression Uses It

The regression model is trained in:

```text
backend/training/train_models.py
```

Function:

```python
train_and_select_models(...)
```

The target column passed from feature engineering is `clv`, so the regression model learns to predict the P&C CLV value created by `pnc_clv_engine.py`.

### How to Run

From the project root:

```bash
cd clv_showcase_project
python backend/training/run_pipeline.py --input-csv backend/data/clv_realistic_50000_5yr.csv
```

This creates/updates:

```text
backend/data/processed/engineered_dataset.csv
backend/data/processed/training_dataset.csv
backend/data/processed/testing_dataset.csv
backend/models/clv_regressor.pkl
backend/models/high_value_classifier.pkl
backend/models/metadata.json
```

### How to Show Your Manager

Open this file:

```text
backend/training/pnc_clv_engine.py
```

Show these functions:

```python
add_pnc_clv_inputs(data)
calculate_pnc_clv(row)
add_pnc_clv_target(data)
```

The manager-visible formula is written directly inside `calculate_pnc_clv(row)`.

### Prediction API Integration

Frontend files were not changed. Prediction requests continue to use the existing FastAPI endpoints.

At runtime, the backend also creates the P&C formula inputs before prediction in:

```text
backend/app/predictor.py
```

Function:

```python
_prepare_dataframes(records)
```

It calls:

```python
model_df, _ = add_pnc_clv_inputs(raw_df.copy())
```

This means the frontend can send the same raw P&C customer records, and the backend will derive fields such as `expected_claims`, `service_expense_am`, `retention_probability`, `annual_profit`, and `projection_years` before model prediction.

### Bundled Model Artifacts

This ZIP includes refreshed model artifacts trained on a 5,000-row sample for quick local demo usability:

```text
backend/data/pnc_clv_training_sample_5000.csv
backend/models/clv_regressor.pkl
backend/models/high_value_classifier.pkl
backend/models/metadata.json
```

For a full retrain on the 50,000-row raw P&C dataset, run:

```bash
cd clv_showcase_project
PYTHONPATH=backend python backend/training/run_pipeline.py --input-csv backend/data/clv_realistic_50000_5yr.csv
```
