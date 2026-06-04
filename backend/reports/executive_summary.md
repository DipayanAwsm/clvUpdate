# Executive Summary

## Business Objective
- Predict customer lifetime value (CLV) for revenue forecasting and budget optimization.
- Identify high-value customers for retention and premium prioritization.

## What Was Done
- Ingested and profiled the input data with automatic dataset-grain detection.
- Executed EDA to surface value concentration, quality issues, and early business signals.
- Built adaptive RFM-centric feature engineering with graceful fallbacks.
- Applied multi-method feature selection and multi-model benchmarking.
- Selected final models objectively using held-out performance metrics.

## Selected Models
- Regression winner: **Ridge**
- Classification winner: **GradientBoostingClassifier**
- High-value threshold based on CLV quantile: **0.8** (CLV cutoff: **3297.92**)

## Business Value
- Focus retention budget on high CLV customers with elevated churn risk.
- Prioritize premium servicing and upsell for high CLV customers with stable engagement.
- Scale low-cost automated journeys for low CLV segments.

## Artifacts
- Target modeled: `clv`
- CLV target definition: `clv = earnedpremium_am - netloss_paid_am`
- Model metrics: `reports/metrics/model_metrics.json`
- Business action playbook: `reports/business_recommendations.md`