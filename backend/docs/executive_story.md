# Executive Story

## Business Problem
Most customer portfolios contain a small subset of customers generating a disproportionate share of future value. Without CLV intelligence, teams over-spend on low-return segments and under-protect premium accounts.

## Why CLV Matters
- CLV aligns acquisition, retention, and service budgets to expected long-term revenue.
- CLV enables high-value customer prioritization before churn or disengagement occurs.
- CLV supports differentiated treatment: premium care, targeted upsell, or low-cost automation.

## What Analysis Was Performed
1. Base data profiling and data quality diagnostics.
2. EDA to identify value concentration and early risk signals.
3. Feature engineering with RFM and behavioral quality ratios.
4. Feature selection via multiple independent methods.
5. Objective model benchmarking for regression and classification.
6. Explainability analysis to clarify top value drivers.

## Final Model Decision
The selected models are chosen from objective holdout performance, not preference. The platform compares multiple candidates and highlights final winners for:
- CLV regression
- High-value customer classification

## Business Actions Enabled
- Protect high CLV customers with high churn risk using urgent save campaigns.
- Upsell high CLV, low-risk customers with premium offers.
- Nurture medium CLV active customers to improve share-of-wallet.
- Automate low CLV customers with cost-efficient journeys.

## Outcome
This project operationalizes CLV from analysis to API to dashboard, enabling leadership-ready decisioning on budget allocation and customer prioritization.
