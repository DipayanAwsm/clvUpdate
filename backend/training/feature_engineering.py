from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from training.common import LOGGER, PROCESSED_DATA_DIR
from training.pnc_clv_engine import add_pnc_clv_target


@dataclass
class FeatureEngineeringResult:
    dataframe: pd.DataFrame
    target_column: str
    messages: List[str]
    target_definition: Dict[str, Any]


def _find_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    for name in candidates:
        if name in df.columns:
            return name
    return None


def _safe_ratio(numerator: pd.Series, denominator: pd.Series, fill_value: float = 0.0) -> pd.Series:
    ratio = numerator / denominator.replace(0, np.nan)
    return ratio.replace([np.inf, -np.inf], np.nan).fillna(fill_value)


def _derive_insurance_clv_target(data: pd.DataFrame, messages: List[str]) -> Dict[str, Any]:
    """Derive the P&C CLV target used for regression training.

    The visible business formula lives in `training/pnc_clv_engine.py`:

    Premium = directwrittenpremium_am
    Expected Claims = expected_claims
    Expenses = tax_am + commission_expense_am + service_expense_am
    Survival = retention_probability ** year
    """
    enriched_data, clv_meta = add_pnc_clv_target(data)

    for column in enriched_data.columns:
        data[column] = enriched_data[column]

    data["profit"] = data["annual_profit"]

    messages.append(
        "Derived P&C CLV target using direct written premium, expected claims, "
        "expenses, retention survival, discount rate, and projection years. Formula is in "
        "backend/training/pnc_clv_engine.py::calculate_pnc_clv."
    )
    return clv_meta


def _ensure_high_value_flag(
    data: pd.DataFrame,
    target_column: str,
    messages: List[str],
    quantile: float = 0.8,
) -> tuple[pd.DataFrame, float]:
    threshold = float(pd.to_numeric(data[target_column], errors="coerce").quantile(quantile))

    if "high_value_flag" in data.columns:
        existing = pd.to_numeric(data["high_value_flag"], errors="coerce").fillna(0).astype(int)
        if existing.nunique(dropna=True) >= 2:
            data["high_value_flag"] = existing
            return data, threshold
        messages.append(
            "Source `high_value_flag` was single-class; rebuilt high-value labels from CLV quantile."
        )

    data["high_value_flag"] = (
        pd.to_numeric(data[target_column], errors="coerce").fillna(0) >= threshold
    ).astype(int)
    return data, threshold


def engineer_features(
    df: pd.DataFrame,
    target_col: str | None,
    high_value_quantile: float = 0.8,
) -> FeatureEngineeringResult:
    data = df.copy()
    messages: List[str] = []
    target_definition: Dict[str, Any] = {
        "formula": "calibrated_behavioral_fallback",
        "description": "Fallback CLV target generated from behavioral proxies.",
    }

    for col in data.columns:
        if data[col].dtype == "O" and col.endswith("_date"):
            data[col] = pd.to_datetime(data[col], errors="coerce")

    tenure_col = _find_column(
        data, ["tenure_months", "tenure", "customer_tenure", "customertenure", "tenure_days"]
    )
    if tenure_col:
        data[tenure_col] = pd.to_numeric(data[tenure_col], errors="coerce")
        if "days" in tenure_col:
            data["tenure_months"] = data[tenure_col] / 30
        else:
            data["tenure_months"] = data[tenure_col]
    else:
        data["tenure_months"] = np.nan
        messages.append("Tenure column not found; created placeholder tenure_months.")

    recency_source = _find_column(
        data,
        [
            "recency",
            "days_since_last_purchase",
            "days_since_last_transaction",
            "inactivity_days",
            "paymentdelaydays",
        ],
    )
    if recency_source:
        data["recency"] = pd.to_numeric(data[recency_source], errors="coerce")
    elif "last_purchase_date" in data.columns:
        max_date = data["last_purchase_date"].max()
        data["recency"] = (max_date - data["last_purchase_date"]).dt.days
    else:
        data["recency"] = np.clip(180 - data["tenure_months"].fillna(18), 1, 365)
        messages.append("Recency was not directly available; derived proxy from tenure.")

    freq_source = _find_column(
        data,
        [
            "frequency",
            "transactions",
            "orders_count",
            "purchase_count",
            "number_of_orders",
            "policyterm_ct",
        ],
    )
    if freq_source:
        data["frequency"] = pd.to_numeric(data[freq_source], errors="coerce")
    else:
        data["frequency"] = np.clip((data["tenure_months"].fillna(12) / 4).round(), 1, None)
        messages.append("Frequency not found; approximated from tenure.")

    monetary_source = _find_column(
        data,
        [
            "monetary",
            "total_spend",
            "directwrittenpremium_am",
            "earnedpremium_am",
            "premium_amount",
            "annual_premium",
            "revenue",
        ],
    )
    if monetary_source:
        data["monetary"] = pd.to_numeric(data[monetary_source], errors="coerce")
    else:
        data["monetary"] = data["frequency"].fillna(1) * 120.0
        messages.append("Monetary value missing; created baseline proxy from frequency.")

    data["average_order_value"] = _safe_ratio(data["monetary"], data["frequency"], fill_value=0.0)

    claims_col = _find_column(data, ["claims_count", "claims", "num_claims", "claimcount_ct"])
    complaints_col = _find_column(
        data, ["complaints_count", "complaints", "num_complaints", "complaintcount"]
    )
    renewals_col = _find_column(
        data, ["renewals_count", "renewals", "renewal_events", "policy_renewed_flag"]
    )
    policy_col = _find_column(
        data, ["policies_count", "active_policies", "policy_count", "policyterm_ct"]
    )

    if claims_col and policy_col:
        data["claim_rate"] = _safe_ratio(pd.to_numeric(data[claims_col], errors="coerce"), pd.to_numeric(data[policy_col], errors="coerce"))
    elif claims_col:
        data["claim_rate"] = _safe_ratio(pd.to_numeric(data[claims_col], errors="coerce"), data["frequency"])
    else:
        data["claim_rate"] = 0.0
        messages.append("Claim count unavailable; claim_rate set to 0.")

    if complaints_col:
        data["complaint_rate"] = _safe_ratio(
            pd.to_numeric(data[complaints_col], errors="coerce"),
            data["frequency"],
        )
    else:
        data["complaint_rate"] = 0.0
        messages.append("Complaint count unavailable; complaint_rate set to 0.")

    if renewals_col and policy_col:
        data["renewal_ratio"] = _safe_ratio(
            pd.to_numeric(data[renewals_col], errors="coerce"),
            pd.to_numeric(data[policy_col], errors="coerce"),
        )
    elif renewals_col:
        data["renewal_ratio"] = _safe_ratio(
            pd.to_numeric(data[renewals_col], errors="coerce"), data["tenure_months"]
        )
    else:
        data["renewal_ratio"] = 0.0
        messages.append("Renewal fields unavailable; renewal_ratio set to 0.")

    premium_col = _find_column(
        data,
        ["premium_amount", "annual_premium", "premium_paid", "directwrittenpremium_am"],
    )
    if premium_col:
        data["premium_efficiency"] = _safe_ratio(data["monetary"], pd.to_numeric(data[premium_col], errors="coerce"), fill_value=1.0)
    else:
        data["premium_efficiency"] = 1.0

    data["monetary_per_tenure"] = _safe_ratio(data["monetary"], data["tenure_months"].replace(0, np.nan), fill_value=0.0)

    def _zscore(series: pd.Series) -> pd.Series:
        s = pd.to_numeric(series, errors="coerce")
        std = s.std(ddof=0)
        if std == 0 or np.isnan(std):
            return pd.Series(np.zeros(len(s)), index=s.index)
        return (s - s.mean()) / std

    data["engagement_score"] = (
        _zscore(data["frequency"]) + _zscore(data["renewal_ratio"]) - _zscore(data["recency"]) - _zscore(data["complaint_rate"])
    )

    data["tenure_band"] = pd.cut(
        data["tenure_months"].fillna(0),
        bins=[-np.inf, 12, 36, 72, np.inf],
        labels=["new", "growing", "mature", "loyal"],
    ).astype(str)

    if "channel" in data.columns:
        data["engagement_style"] = data["channel"].map(
            {
                "online": "digital",
                "partner": "assisted",
                "agent": "assisted",
                "branch": "in_person",
            }
        ).fillna("mixed")

    clv_formula_meta = _derive_insurance_clv_target(data, messages)

    target_is_usable = False
    source_target_name: str | None = None
    if target_col and target_col in data.columns:
        as_num = pd.to_numeric(data[target_col], errors="coerce")
        if as_num.nunique(dropna=True) > 10 and as_num.std(ddof=0) > 1e-6:
            data[target_col] = as_num
            target_is_usable = True
            source_target_name = str(target_col)
        else:
            messages.append(
                f"Target `{target_col}` had insufficient variance; generated calibrated CLV target for modeling."
            )

    preferred_external_targets = {"predicted_clv", "target_clv"}
    if clv_formula_meta.get("available"):
        # Prefer formula-derived CLV when source target is an external prediction column or unusable.
        should_prefer_formula = (
            (not target_is_usable)
            or (source_target_name is not None and source_target_name.lower() in preferred_external_targets)
        )
        if should_prefer_formula:
            data["clv"] = pd.to_numeric(data["clv_formula_value"], errors="coerce").fillna(0.0)
            resolved_target = "clv"
            target_definition = {
                "formula": clv_formula_meta["formula"],
                "description": "Training target computed using the P&C CLV formula: premium minus expected claims and expenses, adjusted by retention survival and discounting.",
                "details": clv_formula_meta,
            }
            if source_target_name in preferred_external_targets:
                messages.append(
                    "Ignored source prediction-style target for model training and used formula-based CLV instead."
                )
            target_is_usable = True
        elif target_is_usable and source_target_name:
            resolved_target = source_target_name
            target_definition = {
                "formula": f"source_column:{source_target_name}",
                "description": "Training target taken directly from source dataset.",
            }
        else:
            resolved_target = "clv"
    else:
        if target_is_usable and source_target_name:
            resolved_target = source_target_name
            target_definition = {
                "formula": f"source_column:{source_target_name}",
                "description": "Training target taken directly from source dataset.",
            }
        else:
            resolved_target = "clv"
            noise = np.random.default_rng(42).normal(0, 250, len(data))
            income_series = (
                pd.to_numeric(data["householdincome"], errors="coerce").fillna(0.0)
                if "householdincome" in data.columns
                else pd.Series(0.0, index=data.index)
            )
            data["clv"] = (
                500
                + 0.75 * data["monetary"].fillna(0)
                + 35 * data["frequency"].fillna(0)
                + 10 * data["tenure_months"].fillna(0)
                - 3.5 * data["recency"].fillna(0)
                - 250 * data["complaint_rate"].fillna(0)
                + 850 * data["renewal_ratio"].fillna(0)
                + 0.002 * income_series
                + noise
            )
            data["clv"] = data["clv"].clip(lower=50)
            if not target_col or target_col not in data.columns:
                messages.append(
                    "Target CLV missing in source; generated calibrated demo target for showcase modeling."
                )

    data, high_value_threshold = _ensure_high_value_flag(
        data=data,
        target_column=resolved_target,
        messages=messages,
        quantile=high_value_quantile,
    )
    target_definition["high_value_quantile"] = high_value_quantile
    target_definition["high_value_threshold"] = high_value_threshold

    numeric_cols = data.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        data[col] = pd.to_numeric(data[col], errors="coerce")

    output_path = PROCESSED_DATA_DIR / "engineered_dataset.csv"
    data.to_csv(output_path, index=False)
    LOGGER.info("Feature engineering complete. Output saved to %s", output_path)

    return FeatureEngineeringResult(
        dataframe=data,
        target_column=resolved_target,
        messages=messages,
        target_definition=target_definition,
    )
