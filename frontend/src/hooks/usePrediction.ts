import { useMemo } from 'react';

import { apiClient } from '../api/client';
import { clamp } from '../utils/format';
import type { PredictionInput, PredictionOutput, SegmentLabel } from '../types';

interface BackendPrediction {
  predicted_clv?: number;
  high_value_probability?: number;
  high_value_flag?: number;
  recommended_action?: string;
  prediction_context?: Record<string, any>;
}

interface BackendBatchResponse {
  predictions?: BackendPrediction[];
}

const classifySegment = (clv: number, riskScore: number): SegmentLabel => {
  if (clv <= 0) return 'Loss Making';
  if (clv >= 3600 && riskScore < 0.45) return 'High Value, Low Risk';
  if (clv >= 3600) return 'High Value, High Risk';
  if (clv >= 1700) return 'Growth Potential';
  return 'Low Value';
};

const recommendationBySegment = (segment: SegmentLabel) => {
  switch (segment) {
    case 'High Value, High Risk':
      return 'Launch urgent save campaign with pricing review and senior servicing support.';
    case 'High Value, Low Risk':
      return 'Prioritize loyalty benefits and cross-sell premium endorsements.';
    case 'Growth Potential':
      return 'Nurture with targeted offers and monitor behavior changes monthly.';
    case 'Loss Making':
      return 'Review pricing adequacy and move account to strict risk controls.';
    default:
      return 'Serve via low-touch automation while monitoring segment movement.';
  }
};

const inferRiskLevel = (riskScore: number): 'Low' | 'Medium' | 'High' => {
  if (riskScore >= 0.68) return 'High';
  if (riskScore >= 0.45) return 'Medium';
  return 'Low';
};

const normalizeSegment = (segment: unknown, fallback: SegmentLabel): SegmentLabel => {
  const value = String(segment || '').trim();
  if (value === 'High Value, Low Risk') return value;
  if (value === 'High Value, High Risk') return value;
  if (value === 'Growth Potential') return value;
  if (value === 'Loss Making') return value;
  if (value === 'Low Value') return value;
  return fallback;
};

const normalizeRiskLevel = (value: unknown, fallback: 'Low' | 'Medium' | 'High') => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('high')) return 'High';
  if (normalized.includes('medium')) return 'Medium';
  if (normalized.includes('low')) return 'Low';
  return fallback;
};

const computePrediction = (input: PredictionInput): PredictionOutput => {
  const profit = input.earnedPremium - input.netLossPaid - input.earnedPremium * 0.18;
  const coverageFactor = Math.log(Math.max(input.coverageAmount, 100000) / 100000 + 1) * 220;
  const tenureFactor = input.customerTenure * 8;
  const scoreFactor = (input.creditScore - 600) * 4;
  const satisfactionFactor = (input.customerSatisfaction - 3) * 180;
  const delayPenalty = input.paymentDelayDays * 22;
  const claimsPenalty = input.claimCount * 120;
  const deductibleBoost = input.deductible < 1000 ? -140 : 60;
  const discountPenalty = input.discountRate * 820;

  const predictedClv =
    profit * 2.2 +
    coverageFactor +
    tenureFactor +
    scoreFactor +
    satisfactionFactor +
    deductibleBoost -
    delayPenalty -
    claimsPenalty -
    discountPenalty;

  const riskScore = clamp(
    (input.netLossPaid / Math.max(input.earnedPremium, 1)) * 0.62 +
      (input.claimCount / 6) * 0.18 +
      (input.paymentDelayDays / 35) * 0.2,
    0,
    1
  );

  const highValueProbability = clamp(0.15 + predictedClv / 5000 - riskScore * 0.18, 0.01, 0.99);
  const segment = classifySegment(predictedClv, riskScore);

  return {
    predictedClv: Number(predictedClv.toFixed(2)),
    highValueProbability: Number(highValueProbability.toFixed(3)),
    highValueFlag:
      segment === 'High Value, Low Risk' || segment === 'High Value, High Risk' || highValueProbability >= 0.66
        ? 1
        : 0,
    segment,
    riskLevel: inferRiskLevel(riskScore),
    recommendedAction: recommendationBySegment(segment)
  };
};

const toBackendRecord = (input: PredictionInput) => ({
  customer_id: `UI-${Date.now()}`,
  year: input.year,
  policyratedstate_tp: input.state,
  earnedpremium_am: input.earnedPremium,
  netloss_paid_am: input.netLossPaid,
  customertenure: input.customerTenure,
  creditscore: input.creditScore,
  paymentdelaydays: input.paymentDelayDays,
  customersatisfaction: input.customerSatisfaction,
  claimcount_ct: input.claimCount,
  deductible: input.deductible,
  coverageamount: input.coverageAmount,
  marketingchannel: input.marketingChannel,
  agentexperienceyears: input.agentExperienceYears,
  discountrate: input.discountRate,
  monetary: input.earnedPremium - input.netLossPaid,
  average_order_value: input.claimCount > 0 ? input.earnedPremium / input.claimCount : input.earnedPremium
});

const mapBackendPrediction = (raw: BackendPrediction, fallbackInput: PredictionInput): PredictionOutput => {
  const fallback = computePrediction(fallbackInput);

  const predictedClv = Number(raw.predicted_clv ?? fallback.predictedClv);
  const probability = clamp(Number(raw.high_value_probability ?? fallback.highValueProbability), 0, 1);
  const highValueFlag = Number(raw.high_value_flag ?? fallback.highValueFlag) ? 1 : 0;

  const fallbackSegment =
    predictedClv >= 3600
      ? highValueFlag
        ? 'High Value, Low Risk'
        : 'High Value, High Risk'
      : predictedClv >= 1700
        ? 'Growth Potential'
        : predictedClv <= 0
          ? 'Loss Making'
          : 'Low Value';

  const segment = normalizeSegment(raw.prediction_context?.customer_segment, fallbackSegment);
  const riskLevel = normalizeRiskLevel(raw.prediction_context?.churn_risk_band, fallback.riskLevel);

  return {
    predictedClv: Number(predictedClv.toFixed(2)),
    highValueProbability: Number(probability.toFixed(3)),
    highValueFlag,
    segment,
    riskLevel,
    recommendedAction: String(raw.recommended_action || recommendationBySegment(segment))
  };
};

export const usePrediction = () => {
  return useMemo(
    () => ({
      predictSingle: async (input: PredictionInput): Promise<PredictionOutput> => {
        try {
          const response = await apiClient.post<BackendPrediction>('/predict', toBackendRecord(input));
          return mapBackendPrediction(response, input);
        } catch {
          return computePrediction(input);
        }
      },
      predictBatch: async (rows: PredictionInput[]): Promise<PredictionOutput[]> => {
        try {
          const payload = { records: rows.map((row) => toBackendRecord(row)) };
          const response = await apiClient.post<BackendBatchResponse>('/predict-batch', payload);
          const predictions = Array.isArray(response.predictions) ? response.predictions : [];
          if (!predictions.length) {
            return rows.map((row) => computePrediction(row));
          }
          return rows.map((row, index) => mapBackendPrediction(predictions[index] || {}, row));
        } catch {
          return rows.map((row) => computePrediction(row));
        }
      }
    }),
    []
  );
};
