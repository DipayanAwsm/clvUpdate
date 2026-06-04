# EDA Summary

## Base Data Overview
- Rows: **50000**
- Columns: **53**
- Duplicate rows: **0**
- Numeric columns: **37**
- Categorical columns: **16**

## Data Quality
- Missing values report saved to `reports/metrics/missing_values_report.csv`.
- Numeric profile saved to `reports/metrics/numeric_summary.csv`.
- Categorical profile saved to `reports/metrics/categorical_summary.csv` when applicable.

## Business Interpretation
- CLV target unavailable at this stage; distribution insights deferred.
- Complaint indicators should be tracked as service-experience risk signals that can suppress long-term value.
- Payment-delay style features can be used as early warning signals for collections and retention risk.
- Renewal behavior appears in the dataset and is expected to be a major CLV driver.
- High spend, long tenure, and healthy renewal behavior generally indicate premium-value customer profiles.

## Exploratory Drivers
- Target-driver correlation analysis was limited by available target fields.

## State-Wise Portfolio View
- Premium by state was aggregated using `earnedpremium_am`.
- Losses by state were aggregated using `netloss_paid_am`.
- Claim count by state was aggregated using `claimcount_ct`.
- State summary table saved to `reports/metrics/state_wise_eda.csv`.

## Artifacts
- `reports/figures/clv_histogram.png`
- `reports/figures/clv_boxplot.png`
- `reports/figures/correlation_heatmap.png`
- `reports/metrics/segment_summary.csv`
- `reports/metrics/state_wise_eda.csv`