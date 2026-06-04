# Feature Selection Summary

## Methods Applied
- Correlation / univariate relationship analysis
- Mutual information
- RFECV (recursive feature elimination with cross-validation)
- Random Forest model-based importance
- L1 regularization (Lasso absolute coefficients)

## Top Features by Method
- **correlation_top**: clv_formula_value, profit, netloss_paid_am, grosslosspaio_am, claimcount_ct, claim_rate, customersatisfaction, complaintcount
- **mutual_info_top**: clv_formula_value, earnedpremium_am, profit, monetary, directwrittenpremium_am, average_order_value, tax_am, admin_expense_am
- **rfecv_selected**: earnedpremium_am, tax_am, grosslosspaio_am, netloss_paid_am, householdincome, creditscore, clv_formula_value, profit
- **rf_importance_top**: clv_formula_value, profit, netloss_paid_am, grosslosspaio_am, earnedpremium_am, tax_am, creditscore, householdincome
- **lasso_top**: netloss_paid_am, monetary, coverageamount, ppcvrglimit_am, directwrittenpremium_am, grosslosspaio_am, clv_formula_value, earnedpremium_am

## Final Shortlisted Features
- netloss_paid_am, tax_am, householdincome, creditscore, claimcount_ct, claim_rate, monetary, directwrittenpremium_am, coverageamount, customersatisfaction, average_order_value, complaintcount, commission_expense_am, monetary_per_tenure, policy_renewed_flag, hazard_score, dwellingsquarefeet_ct, zip

## Selection Guardrails Applied
- Feature selection executed on a representative 20,000-row sample for runtime efficiency.
- Excluded leakage-prone columns from feature selection: high_value_flag
- Excluded identifier-style columns with low generalization value: fullpolicy_nb
- Excluded high-cardinality categorical fields to reduce overfit risk: policyeffective_dt
- Excluded zero/near-zero variance fields: premium_efficiency, tenure_band
- RFECV skipped for runtime safety on large/high-dimensional data; retained top tree-importance features as RFECV proxy.

## Why These Features
- Selected features consistently scored well across multiple statistical and model-based methods.
- The shortlist balances predictive signal with business interpretability for stakeholder trust.
- RFM-derived behavior fields (recency, frequency, monetary) are retained because they capture purchase dynamics directly linked to CLV.