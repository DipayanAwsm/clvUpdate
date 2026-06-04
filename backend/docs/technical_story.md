# Technical Story

## Preprocessing and Data Ingestion
- CSV input ingestion with schema profiling (shape, types, missingness, duplicates).
- Automatic grain detection:
  - `row_level` customer data -> direct model training.
  - `summary_level` metrics -> calibrated synthetic row-level generation for demo continuity.
- Dataset profile persisted to `backend/reports/metrics/dataset_profile.json`.

## Feature Engineering
- Adaptive RFM generation:
  - **Recency** from inactivity fields/date deltas.
  - **Frequency** from transactions/orders proxies.
  - **Monetary** from spend/premium/revenue proxies.
- Additional engineered signals:
  - Average order value
  - Claim rate
  - Complaint rate
  - Renewal ratio
  - Premium efficiency
  - Engagement score
  - Tenure bands
- Missing input fields are handled gracefully with fallbacks and run notes.

## Why RFM Matters
RFM compresses customer behavior into interpretable dimensions that are highly predictive for CLV and easy for business teams to reason about.

## Feature Selection Methods
- Correlation / univariate analysis
- Mutual information
- RFECV
- Random Forest importance
- L1 regularization (Lasso)
- Combined ranking + voting produces a final shortlist persisted for traceability.

## Model Training and Evaluation
### Regression (CLV)
- Linear Regression
- Ridge
- Lasso
- Random Forest Regressor
- Gradient Boosting Regressor
- XGBoost Regressor if available

Metrics: R2, MAE, RMSE, MAPE (when valid)

### Classification (High Value)
- Logistic Regression
- Random Forest Classifier
- Gradient Boosting Classifier
- XGBoost Classifier if available

Metrics: Accuracy, Precision, Recall, F1, ROC-AUC, confusion matrix

## Explainability
- SHAP summary plot when SHAP dependencies are available.
- Fallback to permutation importance when SHAP is unavailable.
- Plain-English interpretation of top features and expected directionality.

## API Architecture
- FastAPI + Pydantic schemas.
- Endpoints:
  - `/health`
  - `/metadata`
  - `/model-metrics`
  - `/eda-summary`
  - `/feature-selection-summary`
  - `/predict`
  - `/predict-batch`
  - `/upload-csv-and-predict`
- Response payloads include business-descriptive fields:
  - confidence band
  - customer segment
  - churn-risk score
  - action priority
  - budget treatment guidance
  - batch portfolio summary for operational decisioning

## Frontend Architecture
- React + Vite single-page dashboard.
- Recharts for metric visualization.
- Sections for base data, EDA, feature engineering, feature selection, model comparison, prediction, batch scoring, and business actions.
- API integration via typed fetch client in `frontend/src/api/client.ts`.
