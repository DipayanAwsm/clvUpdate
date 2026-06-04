"""P&C Customer Lifetime Value calculation engine.

This module keeps the P&C CLV formula visible in code for business review.
It is intentionally separated from model training so managers, actuaries,
and data scientists can inspect the target definition without reading the
full ML pipeline.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, Optional

import numpy as np
import pandas as pd


DEFAULT_DISCOUNT_RATE = 0.10
DEFAULT_PROJECTION_YEARS = 5
LOSS_COST_FACTOR = 0.02


def _find_column(df: pd.DataFrame, candidates: Iterable[str]) -> Optional[str]:
    """Find a column after preprocessing has lower-cased the raw CSV headers."""
    columns = set(df.columns)
    for candidate in candidates:
        normalized = candidate.strip().lower()
        if normalized in columns:
            return normalized
    return None


def _numeric_series(df: pd.DataFrame, column: Optional[str], default: float = 0.0) -> pd.Series:
    if column and column in df.columns:
        return pd.to_numeric(df[column], errors="coerce").fillna(default)
    return pd.Series(default, index=df.index, dtype="float64")


def _safe_ratio(numerator: pd.Series, denominator: pd.Series, fill_value: float = 0.0) -> pd.Series:
    ratio = numerator / denominator.replace(0, np.nan)
    return ratio.replace([np.inf, -np.inf], np.nan).fillna(fill_value)


def add_pnc_clv_inputs(data: pd.DataFrame) -> tuple[pd.DataFrame, Dict[str, Any]]:
    """Create/standardize the visible inputs used by the P&C CLV formula.

    The formula requires the following columns:
    - directwrittenpremium_am
    - expected_claims
    - tax_am
    - commission_expense_am
    - service_expense_am
    - retention_probability
    - discount_rate
    - projection_years

    If an input is not available in the raw data, this function derives a
    transparent proxy and records it in the returned metadata.
    """
    df = data.copy()
    # Normalize possible raw/API column names such as DIRECTWRITTENPREMIUM_AM
    # or "Direct Written Premium" to the same snake-case style used in training.
    df.columns = [
        str(col)
        .strip()
        .lower()
        .replace("%", "percent")
        .replace("/", "_")
        .replace("-", "_")
        .replace(" ", "_")
        for col in df.columns
    ]

    premium_col = _find_column(df, ["directwrittenpremium_am", "premium_amount", "annual_premium"])
    tax_col = _find_column(df, ["tax_am", "tax_amount"])
    commission_col = _find_column(df, ["commission_expense_am", "commission_amount"])
    service_col = _find_column(df, ["service_expense_am", "admin_expense_am", "administrative_expense_am"])
    expected_claims_col = _find_column(df, ["expected_claims", "expected_claims_am"])
    claim_count_col = _find_column(df, ["claimcount_ct", "claims_count", "claims", "num_claims"])
    policy_term_col = _find_column(df, ["policyterm_ct", "policy_term", "policy_count"])
    coverage_col = _find_column(df, ["coverageamount", "ppcvrglimit_am", "coverage_amount"])
    hazard_col = _find_column(df, ["hazard_score", "hazardscore"])
    renewal_col = _find_column(df, ["policy_renewed_flag", "renewed_flag", "renewal_flag"])
    satisfaction_col = _find_column(df, ["customersatisfaction", "customer_satisfaction"])
    complaint_col = _find_column(df, ["complaintcount", "complaints_count", "num_complaints"])
    payment_delay_col = _find_column(df, ["paymentdelaydays", "payment_delay_days"])
    credit_score_col = _find_column(df, ["creditscore", "credit_score"])
    discount_col = _find_column(df, ["discount_rate", "discountrate"])
    projection_col = _find_column(df, ["projection_years", "projectionyears"])

    # 1) Premium = directwrittenpremium_am
    df["directwrittenpremium_am"] = _numeric_series(df, premium_col, 0.0)

    # 2) Expected Claims = expected_claims
    # If expected_claims is not supplied, derive it from P&C exposure drivers:
    # claim frequency x coverage amount x hazard factor x loss cost factor.
    if expected_claims_col:
        df["expected_claims"] = _numeric_series(df, expected_claims_col, 0.0)
        expected_claims_method = f"source_column:{expected_claims_col}"
    else:
        claim_count = _numeric_series(df, claim_count_col, 0.0)
        policy_term = _numeric_series(df, policy_term_col, 12.0).replace(0, np.nan)
        coverage = _numeric_series(df, coverage_col, 0.0)
        hazard = _numeric_series(df, hazard_col, 50.0).clip(lower=0.0, upper=100.0) / 100.0
        claim_frequency = _safe_ratio(claim_count, policy_term, fill_value=0.0)
        df["claim_rate"] = claim_frequency
        df["coverageamount"] = coverage
        df["hazard_score"] = hazard * 100.0
        df["expected_claims"] = (claim_frequency * coverage * hazard * LOSS_COST_FACTOR).clip(lower=0.0)
        expected_claims_method = (
            "derived: claim_frequency * coverageamount * hazard_score_factor * loss_cost_factor"
        )

    if "claim_rate" not in df.columns:
        claim_count = _numeric_series(df, claim_count_col, 0.0)
        policy_term = _numeric_series(df, policy_term_col, 12.0).replace(0, np.nan)
        df["claim_rate"] = _safe_ratio(claim_count, policy_term, fill_value=0.0)
    if "coverageamount" not in df.columns:
        df["coverageamount"] = _numeric_series(df, coverage_col, 0.0)
    if "hazard_score" not in df.columns:
        df["hazard_score"] = _numeric_series(df, hazard_col, 50.0)
    df["monetary"] = df["directwrittenpremium_am"]

    # 3) Expenses = tax_am + commission_expense_am + service_expense_am
    df["tax_am"] = _numeric_series(df, tax_col, 0.0)
    df["commission_expense_am"] = _numeric_series(df, commission_col, 0.0)
    df["service_expense_am"] = _numeric_series(df, service_col, 0.0)
    df["pnc_expenses"] = df["tax_am"] + df["commission_expense_am"] + df["service_expense_am"]
    df["annual_profit"] = df["directwrittenpremium_am"] - df["expected_claims"] - df["pnc_expenses"]

    # 4) Survival = retention_probability ** year
    # If no explicit retention_probability exists, derive a bounded retention score
    # from renewal status and customer behavior. This creates an explainable P&C proxy.
    explicit_retention_col = _find_column(df, ["retention_probability", "retention_prob"])
    if explicit_retention_col:
        df["retention_probability"] = _numeric_series(df, explicit_retention_col, 0.85).clip(0.01, 0.99)
        retention_method = f"source_column:{explicit_retention_col}"
    else:
        renewal = _numeric_series(df, renewal_col, 0.0).clip(0.0, 1.0)
        satisfaction = _numeric_series(df, satisfaction_col, 5.0).clip(1.0, 10.0)
        complaints = _numeric_series(df, complaint_col, 0.0).clip(lower=0.0)
        payment_delay = _numeric_series(df, payment_delay_col, 0.0).clip(lower=0.0)
        credit_score = _numeric_series(df, credit_score_col, 650.0).clip(300.0, 850.0)

        df["retention_probability"] = (
            0.55
            + 0.20 * renewal
            + 0.015 * satisfaction
            + 0.0002 * (credit_score - 650.0)
            - 0.020 * complaints
            - 0.002 * payment_delay
        ).clip(0.05, 0.98)
        retention_method = (
            "derived: renewal + satisfaction + credit_score - complaints - payment_delay"
        )

    # 5) Discount Rate = discount_rate
    df["discount_rate"] = _numeric_series(df, discount_col, DEFAULT_DISCOUNT_RATE).clip(0.0, 0.50)

    # 6) Projection Years = projection_years
    df["projection_years"] = _numeric_series(df, projection_col, DEFAULT_PROJECTION_YEARS)
    df["projection_years"] = df["projection_years"].round().clip(1, 10).astype(int)

    return df, {
        "premium_column": premium_col,
        "expected_claims_method": expected_claims_method,
        "tax_column": tax_col,
        "commission_column": commission_col,
        "service_expense_column": service_col,
        "retention_probability_method": retention_method,
        "discount_rate_column": discount_col or f"default:{DEFAULT_DISCOUNT_RATE}",
        "projection_years_column": projection_col or f"default:{DEFAULT_PROJECTION_YEARS}",
        "loss_cost_factor_when_expected_claims_missing": LOSS_COST_FACTOR,
    }


def calculate_pnc_clv(row: pd.Series) -> float:
    """Calculate row-level P&C CLV using the manager-visible formula.

    Premium = directwrittenpremium_am
    Expected Claims = expected_claims
    Expenses = tax_am + commission_expense_am + service_expense_am
    Survival = retention_probability ** year

    P&C CLV = sum over projection years of:
        ((Premium - Expected Claims - Expenses) * Survival) / (1 + Discount Rate) ** year
    """
    premium = float(row.get("directwrittenpremium_am", 0.0) or 0.0)
    expected_claims = float(row.get("expected_claims", 0.0) or 0.0)
    expenses = (
        float(row.get("tax_am", 0.0) or 0.0)
        + float(row.get("commission_expense_am", 0.0) or 0.0)
        + float(row.get("service_expense_am", 0.0) or 0.0)
    )
    retention_probability = float(row.get("retention_probability", 0.85) or 0.85)
    discount_rate = float(row.get("discount_rate", DEFAULT_DISCOUNT_RATE) or DEFAULT_DISCOUNT_RATE)
    projection_years = int(row.get("projection_years", DEFAULT_PROJECTION_YEARS) or DEFAULT_PROJECTION_YEARS)

    annual_profit = premium - expected_claims - expenses
    pnc_clv = 0.0

    for year in range(1, projection_years + 1):
        survival = retention_probability ** year
        pnc_clv += (annual_profit * survival) / ((1.0 + discount_rate) ** year)

    return float(pnc_clv)


def add_pnc_clv_target(data: pd.DataFrame) -> tuple[pd.DataFrame, Dict[str, Any]]:
    """Add the P&C CLV target column used by regression training."""
    df, input_meta = add_pnc_clv_inputs(data)
    df["annual_profit"] = (
        df["directwrittenpremium_am"] - df["expected_claims"] - df["pnc_expenses"]
    )
    df["clv_formula_value"] = df.apply(calculate_pnc_clv, axis=1)

    metadata = {
        "available": True,
        "column": "clv_formula_value",
        "formula": (
            "P&C CLV = sum_years(((directwrittenpremium_am - expected_claims - "
            "(tax_am + commission_expense_am + service_expense_am)) * "
            "(retention_probability ** year)) / ((1 + discount_rate) ** year))"
        ),
        "business_formula": {
            "Premium": "directwrittenpremium_am",
            "Expected Claims": "expected_claims",
            "Expenses": "tax_am + commission_expense_am + service_expense_am",
            "Survival": "retention_probability ** year",
            "Discount Rate": "discount_rate",
            "Projection Years": "projection_years",
        },
        "details": input_meta,
    }
    return df, metadata
