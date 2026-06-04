from __future__ import annotations

"""P&C CLV and renewal propensity utilities.

This module intentionally keeps the business formula visible for managers,
reviewers, and auditors. The regression model is trained on the CLV target
created here.

P&C CLV formula implemented:
    Premium = directwrittenpremium_am
    Expected Claims = expected_claims
    Expenses = tax_am + commission_expense_am + service_expense_am
    Survival = retention_probability ** year

    P&C CLV = sum(
        ((Premium - Expected Claims - Expenses) * Survival) / ((1 + discount_rate) ** year)
        for year in 1..projection_years
    )
"""

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


RENEWAL_MODEL_FILENAME = "renewal_propensity_model.pkl"
RENEWAL_METADATA_FILENAME = "renewal_propensity_metadata.json"
DEFAULT_DISCOUNT_RATE = 0.10
DEFAULT_PROJECTION_YEARS = 5


@dataclass
class RenewalPropensityResult:
    probabilities: pd.Series
    model: Any | None
    features: List[str]
    model_name: str
    auc: float | None
    message: str


def _find_column(df: pd.DataFrame, candidates: Iterable[str]) -> Optional[str]:
    for name in candidates:
        if name in df.columns:
            return name
    return None


def _num(data: pd.DataFrame, column: str | None, default: float = 0.0) -> pd.Series:
    if column and column in data.columns:
        return pd.to_numeric(data[column], errors="coerce").fillna(default)
    return pd.Series(default, index=data.index, dtype=float)


def _safe_ratio(numerator: pd.Series, denominator: pd.Series, fill_value: float = 0.0) -> pd.Series:
    ratio = numerator / denominator.replace(0, np.nan)
    return ratio.replace([np.inf, -np.inf], np.nan).fillna(fill_value)


def ensure_pnc_clv_input_columns(data: pd.DataFrame) -> pd.DataFrame:
    """Create the explicit input columns required by the P&C CLV formula.

    The raw P&C dataset may not always contain `expected_claims`,
    `service_expense_am`, `discount_rate`, or `projection_years`. This function
    creates explainable defaults so the CLV formula is always visible and usable.
    """
    df = data.copy()

    premium_col = _find_column(df, ["directwrittenpremium_am", "earnedpremium_am", "premium_amount", "annual_premium"])
    loss_col = _find_column(df, ["netloss_paid_am", "net_loss_paid_am", "loss_paid_amount"])
    claim_count_col = _find_column(df, ["claimcount_ct", "claims_count", "claims", "num_claims"])
    policy_count_col = _find_column(df, ["policyterm_ct", "policies_count", "active_policies", "policy_count"])
    coverage_col = _find_column(df, ["coverageamount", "coverage_amount", "insured_value"])
    hazard_col = _find_column(df, ["hazard_score", "risk_score"])

    premium = _num(df, premium_col, 0.0).clip(lower=0.0)
    if "directwrittenpremium_am" not in df.columns:
        df["directwrittenpremium_am"] = premium
    loss_paid = _num(df, loss_col, 0.0).clip(lower=0.0)
    claim_count = _num(df, claim_count_col, 0.0).clip(lower=0.0)
    policy_count = _num(df, policy_count_col, 1.0).clip(lower=1.0)
    coverage = _num(df, coverage_col, 0.0).clip(lower=0.0)
    hazard_score = _num(df, hazard_col, 1.0).clip(lower=0.1, upper=5.0)

    if "claim_rate" not in df.columns:
        df["claim_rate"] = _safe_ratio(claim_count, policy_count, fill_value=0.0)

    if "expected_claims" not in df.columns:
        # P&C expected claims proxy:
        # Prefer historical paid losses where present; otherwise estimate from
        # claim rate, exposure/coverage, and hazard score. The cap prevents one
        # extreme exposure value from dominating synthetic/demo data.
        exposure_claim_estimate = (pd.to_numeric(df["claim_rate"], errors="coerce").fillna(0.0) * coverage * hazard_score * 0.01)
        expected_claims = np.where(loss_paid > 0, loss_paid, exposure_claim_estimate)
        df["expected_claims"] = pd.Series(expected_claims, index=df.index).clip(lower=0.0)

    if "tax_am" not in df.columns:
        df["tax_am"] = (premium * 0.02).round(2)

    if "commission_expense_am" not in df.columns:
        df["commission_expense_am"] = (premium * 0.10).round(2)

    if "service_expense_am" not in df.columns:
        df["service_expense_am"] = (premium * 0.05).round(2)

    if "discount_rate" not in df.columns:
        df["discount_rate"] = DEFAULT_DISCOUNT_RATE

    if "projection_years" not in df.columns:
        df["projection_years"] = DEFAULT_PROJECTION_YEARS

    return df


def _renewal_feature_candidates(df: pd.DataFrame) -> List[str]:
    candidates = [
        "tenure_months",
        "tenure",
        "customer_tenure",
        "customertenure",
        "claim_rate",
        "claimcount_ct",
        "expected_claims",
        "netloss_paid_am",
        "directwrittenpremium_am",
        "earnedpremium_am",
        "coverageamount",
        "householdincome",
        "creditscore",
        "customersatisfaction",
        "complaintcount",
        "complaint_rate",
        "hazard_score",
        "monetary",
        "average_order_value",
        "monetary_per_tenure",
        "premium_efficiency",
        "state",
        "policy_state",
        "channel",
        "segment",
        "tenure_band",
    ]
    return [col for col in candidates if col in df.columns]


def _build_retention_fallback(df: pd.DataFrame) -> pd.Series:
    """Explainable fallback when a renewal model cannot be trained."""
    renewed = _num(df, _find_column(df, ["policy_renewed_flag", "renewed_flag", "renewal_flag"]), 0.0).clip(0, 1)
    satisfaction = _num(df, _find_column(df, ["customersatisfaction", "customer_satisfaction"]), 7.0).clip(1, 10) / 10.0
    credit = _num(df, _find_column(df, ["creditscore", "credit_score"]), 650.0).clip(300, 850)
    credit_norm = (credit - 300.0) / 550.0
    claim_rate = _num(df, "claim_rate", 0.0).clip(0, 3)
    complaints = _num(df, _find_column(df, ["complaintcount", "complaints_count", "complaints"]), 0.0).clip(0, 10)

    probability = (
        0.50
        + 0.25 * renewed
        + 0.15 * satisfaction
        + 0.10 * credit_norm
        - 0.08 * claim_rate
        - 0.02 * complaints
    )
    return probability.clip(0.35, 0.97)


def train_or_apply_renewal_propensity(
    data: pd.DataFrame,
    model_dir: str | Path | None = None,
    save_model: bool = True,
) -> RenewalPropensityResult:
    """Train a renewal propensity model and return `retention_probability`.

    Target: `policy_renewed_flag` when available.
    Output: probability of renewal, used as the P&C CLV survival base.
    """
    df = ensure_pnc_clv_input_columns(data)
    target_col = _find_column(df, ["policy_renewed_flag", "renewed_flag", "renewal_flag"])
    features = _renewal_feature_candidates(df)

    if not target_col or pd.to_numeric(df[target_col], errors="coerce").nunique(dropna=True) < 2 or not features:
        return RenewalPropensityResult(
            probabilities=_build_retention_fallback(df),
            model=None,
            features=features,
            model_name="fallback_retention_score",
            auc=None,
            message="Renewal target was missing/single-class; used explainable retention fallback.",
        )

    y = pd.to_numeric(df[target_col], errors="coerce").fillna(0).astype(int).clip(0, 1)
    X = df[features].copy()

    numeric_features = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_features = [col for col in X.columns if col not in numeric_features]
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), numeric_features),
            ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical_features),
        ]
    )

    candidates = [
        ("LogisticRegression", LogisticRegression(max_iter=1500)),
        ("RandomForestClassifier", RandomForestClassifier(n_estimators=160, random_state=42, n_jobs=1)),
        ("GradientBoostingClassifier", GradientBoostingClassifier(random_state=42)),
    ]

    stratify = y if y.nunique() == 2 and y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=stratify)

    best_model: Pipeline | None = None
    best_name = "fallback_retention_score"
    best_auc = -1.0
    for name, estimator in candidates:
        model = Pipeline([("preprocessor", preprocessor), ("model", estimator)])
        try:
            model.fit(X_train, y_train)
            prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else model.predict(X_test)
            auc = roc_auc_score(y_test, prob) if y_test.nunique() == 2 else 0.5
            if auc > best_auc:
                best_auc = float(auc)
                best_model = model
                best_name = name
        except Exception:
            continue

    if best_model is None:
        return RenewalPropensityResult(
            probabilities=_build_retention_fallback(df),
            model=None,
            features=features,
            model_name="fallback_retention_score",
            auc=None,
            message="Renewal model training failed; used explainable retention fallback.",
        )

    probabilities = pd.Series(best_model.predict_proba(X)[:, 1], index=df.index).clip(0.35, 0.97)

    if save_model and model_dir is not None:
        model_dir = Path(model_dir)
        model_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(best_model, model_dir / RENEWAL_MODEL_FILENAME)
        metadata = {
            "model_name": best_name,
            "target_column": target_col,
            "features": features,
            "auc": None if best_auc < 0 else round(float(best_auc), 4),
            "output_column": "retention_probability",
            "business_use": "Probability of next-term renewal used as survival base in P&C CLV.",
        }
        (model_dir / RENEWAL_METADATA_FILENAME).write_text(json.dumps(metadata, indent=2))

    return RenewalPropensityResult(
        probabilities=probabilities,
        model=best_model,
        features=features,
        model_name=best_name,
        auc=None if best_auc < 0 else float(best_auc),
        message=f"Trained renewal propensity model `{best_name}`; probability output used as retention_probability.",
    )


def apply_renewal_propensity_model(
    data: pd.DataFrame,
    model_dir: str | Path,
) -> pd.DataFrame:
    """Apply saved renewal model during API/batch prediction.

    If the model artifact is unavailable, this falls back to the transparent
    rule-based retention score so predictions still work.
    """
    df = ensure_pnc_clv_input_columns(data)
    model_path = Path(model_dir) / RENEWAL_MODEL_FILENAME
    if model_path.exists():
        try:
            model = joblib.load(model_path)
            metadata_path = Path(model_dir) / RENEWAL_METADATA_FILENAME
            if metadata_path.exists():
                metadata = json.loads(metadata_path.read_text())
                features = list(metadata.get("features", []))
            else:
                features = _renewal_feature_candidates(df)
            for feature in features:
                if feature not in df.columns:
                    df[feature] = np.nan
            X = df[features].copy()
            df["retention_probability"] = pd.Series(model.predict_proba(X)[:, 1], index=df.index).clip(0.35, 0.97)
            return df
        except Exception:
            pass

    df["retention_probability"] = _build_retention_fallback(df)
    return df


def calculate_pnc_clv(row: pd.Series) -> float:
    """Calculate one row's P&C CLV using the manager-visible formula.

    Premium = directwrittenpremium_am
    Expected Claims = expected_claims
    Expenses = tax_am + commission_expense_am + service_expense_am
    Survival = retention_probability ** year
    """
    premium = float(row.get("directwrittenpremium_am", row.get("earnedpremium_am", 0.0)) or 0.0)
    expected_claims = float(row.get("expected_claims", 0.0) or 0.0)
    tax = float(row.get("tax_am", 0.0) or 0.0)
    commission = float(row.get("commission_expense_am", 0.0) or 0.0)
    service_expense = float(row.get("service_expense_am", 0.0) or 0.0)
    retention_probability = float(row.get("retention_probability", 0.75) or 0.75)
    discount_rate = float(row.get("discount_rate", DEFAULT_DISCOUNT_RATE) or DEFAULT_DISCOUNT_RATE)
    projection_years = int(float(row.get("projection_years", DEFAULT_PROJECTION_YEARS) or DEFAULT_PROJECTION_YEARS))

    retention_probability = float(np.clip(retention_probability, 0.0, 1.0))
    discount_rate = max(discount_rate, 0.0)
    projection_years = max(projection_years, 1)

    expenses = tax + commission + service_expense
    annual_profit = premium - expected_claims - expenses

    pnc_clv = 0.0
    for year in range(1, projection_years + 1):
        survival = retention_probability ** year
        discounted_profit = (annual_profit * survival) / ((1 + discount_rate) ** year)
        pnc_clv += discounted_profit

    return float(pnc_clv)


def add_pnc_clv_columns(
    data: pd.DataFrame,
    model_dir: str | Path | None = None,
    train_renewal_model: bool = True,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Add expected_claims, retention_probability, and P&C CLV columns."""
    df = ensure_pnc_clv_input_columns(data)

    if train_renewal_model:
        result = train_or_apply_renewal_propensity(df, model_dir=model_dir, save_model=bool(model_dir))
        df["retention_probability"] = result.probabilities
        renewal_meta = {
            "model_name": result.model_name,
            "features": result.features,
            "auc": None if result.auc is None else round(float(result.auc), 4),
            "message": result.message,
        }
    else:
        if model_dir is not None:
            df = apply_renewal_propensity_model(df, model_dir=model_dir)
        elif "retention_probability" not in df.columns:
            df["retention_probability"] = _build_retention_fallback(df)
        renewal_meta = {"model_name": "loaded_or_fallback", "message": "Applied saved model or fallback."}

    df["annual_profit"] = (
        pd.to_numeric(df["directwrittenpremium_am"], errors="coerce").fillna(0.0)
        - pd.to_numeric(df["expected_claims"], errors="coerce").fillna(0.0)
        - pd.to_numeric(df["tax_am"], errors="coerce").fillna(0.0)
        - pd.to_numeric(df["commission_expense_am"], errors="coerce").fillna(0.0)
        - pd.to_numeric(df["service_expense_am"], errors="coerce").fillna(0.0)
    )
    df["pnc_clv"] = df.apply(calculate_pnc_clv, axis=1)
    df["clv_formula_value"] = df["pnc_clv"]

    meta = {
        "available": True,
        "column": "pnc_clv",
        "formula": "pnc_clv = sum(((directwrittenpremium_am - expected_claims - tax_am - commission_expense_am - service_expense_am) * (retention_probability ** year)) / ((1 + discount_rate) ** year) for year in 1..projection_years)",
        "premium": "directwrittenpremium_am",
        "expected_claims": "expected_claims",
        "expenses": "tax_am + commission_expense_am + service_expense_am",
        "survival": "retention_probability ** year",
        "discount_rate": "discount_rate",
        "projection_years": "projection_years",
        "renewal_propensity_model": renewal_meta,
    }
    return df, meta
