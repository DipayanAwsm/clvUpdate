import { clamp } from '../utils/format';
import type { CustomerRecord, ModelRow, RecommendationItem, SegmentLabel } from '../types';

export const STATES = ['CA', 'FL', 'NY', 'TX', 'WA'];
export const YEARS = [2021, 2022, 2023, 2024, 2025];

const MARKETING_CHANNELS = ['Agent Referral', 'Social Media', 'Email', 'Paid Search', 'Affiliate'];
const AGENT_CHANNELS = ['Independent', 'Broker', 'Direct', 'Partner'];
const PAYMENT_METHODS = ['Auto Debit', 'Credit Card', 'Bank Transfer', 'Cash'];
const INCOME_BRACKETS = ['Lower', 'Middle', 'Upper Middle', 'High'];

const stateFactor: Record<string, number> = {
  CA: 1.22,
  FL: 1.08,
  NY: 1.12,
  TX: 0.98,
  WA: 0.94
};

const classifySegment = (clv: number, riskScore: number, profit: number): SegmentLabel => {
  if (profit <= 0 || clv <= 0) return 'Loss Making';
  if (clv >= 3600 && riskScore < 0.45) return 'High Value, Low Risk';
  if (clv >= 3600 && riskScore >= 0.45) return 'High Value, High Risk';
  if (clv >= 1700) return 'Growth Potential';
  return 'Low Value';
};

const getRiskLevel = (riskScore: number): 'Low' | 'Medium' | 'High' => {
  if (riskScore >= 0.68) return 'High';
  if (riskScore >= 0.45) return 'Medium';
  return 'Low';
};

const buildRecords = (): CustomerRecord[] => {
  const records: CustomerRecord[] = [];

  YEARS.forEach((year, yearIdx) => {
    STATES.forEach((state, stateIdx) => {
      for (let i = 0; i < 80; i += 1) {
        const premiumBase = 880 + stateFactor[state] * 540 + yearIdx * 78 + ((i % 9) - 4) * 31;
        const discountRate = 0.04 + (i % 7) * 0.011;
        const earnedPremium = premiumBase * (1 - discountRate * 0.22);
        const claimCount = Math.max(0, Math.round((i % 5) * 0.65 + (state === 'CA' || state === 'FL' ? 1 : 0)));
        const hazardScore = 30 + stateIdx * 8 + (i % 18);
        const netLossPaid =
          earnedPremium * (0.3 + claimCount * 0.08 + hazardScore / 260) * (0.84 + (i % 4) * 0.05);
        const commissionExpense = earnedPremium * 0.11;
        const adminExpense = earnedPremium * 0.07;
        const profit = earnedPremium - netLossPaid - commissionExpense - adminExpense;
        const customerTenure = 8 + ((i * 4 + stateIdx * 5) % 120);
        const customerSatisfaction = clamp(2.7 + ((i + stateIdx * 3) % 23) / 10, 1, 5);
        const paymentDelayDays = Math.max(0, ((i * 5 + yearIdx * 2) % 28) - 3);
        const delinquencyFlag = paymentDelayDays > 16 ? 1 : 0;
        const renewalProbability = clamp(
          0.43 + customerTenure / 220 + customerSatisfaction * 0.08 - delinquencyFlag * 0.2 - claimCount * 0.03,
          0.05,
          0.98
        );
        const clv = profit * (1.2 + renewalProbability * 1.85) + customerTenure * 7;
        const lossRatio = netLossPaid / Math.max(earnedPremium, 1);
        const riskScore = clamp(lossRatio * 0.6 + (claimCount / 6) * 0.2 + (paymentDelayDays / 35) * 0.2, 0, 1);
        const segment = classifySegment(clv, riskScore, profit);
        const highValueProbability = clamp(0.1 + clv / 5000 + renewalProbability * 0.2 - riskScore * 0.2, 0.01, 0.99);
        const highValueFlag =
          segment === 'High Value, Low Risk' || segment === 'High Value, High Risk' || highValueProbability >= 0.66
            ? 1
            : 0;

        records.push({
          customerId: `CUST-${year}-${state}-${String(i + 1).padStart(3, '0')}`,
          state,
          year,
          earnedPremium: Number(earnedPremium.toFixed(2)),
          netLossPaid: Number(netLossPaid.toFixed(2)),
          claimCount,
          clv: Number(clv.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          lossRatio: Number(lossRatio.toFixed(3)),
          segment,
          riskScore: Number(riskScore.toFixed(3)),
          riskLevel: getRiskLevel(riskScore),
          marketingChannel: MARKETING_CHANNELS[(i + yearIdx + stateIdx) % MARKETING_CHANNELS.length],
          agentChannel: AGENT_CHANNELS[(i + stateIdx) % AGENT_CHANNELS.length],
          paymentMethod: PAYMENT_METHODS[(i + yearIdx) % PAYMENT_METHODS.length],
          incomeBracket: INCOME_BRACKETS[(i + stateIdx + yearIdx) % INCOME_BRACKETS.length],
          paymentDelayDays,
          customerSatisfaction: Number(customerSatisfaction.toFixed(1)),
          renewalProbability: Number(renewalProbability.toFixed(3)),
          creditScore: 590 + ((i * 11 + stateIdx * 7) % 230),
          customerTenure,
          deductible: 750 + ((i % 5) * 250),
          coverageAmount: 180000 + stateIdx * 40000 + (i % 12) * 18500,
          discountRate: Number(discountRate.toFixed(3)),
          complaintCount: Math.max(0, Math.round((i % 4) - customerSatisfaction / 2.5)),
          delinquencyFlag,
          hazardScore,
          agentExperienceYears: 1 + ((i + stateIdx * 2) % 24),
          highValueProbability: Number(highValueProbability.toFixed(3)),
          highValueFlag
        });
      }
    });
  });

  return records;
};

export const customerRecords: CustomerRecord[] = buildRecords();

export const defaultRecommendations: RecommendationItem[] = [
  {
    title: 'Protect High-Value Customers With High Risk',
    detail: 'Deploy save campaigns within 72 hours for high CLV accounts with worsening loss ratio or delinquency.',
    priority: 'Critical'
  },
  {
    title: 'Accelerate Upsell On Stable Premium Cohorts',
    detail: 'High Value, Low Risk customers are ready for coverage upgrades and cross-sell bundles.',
    priority: 'High'
  },
  {
    title: 'Nurture Growth Potential Segment',
    detail: 'Use educational and loyalty nudges to move Growth Potential customers into premium cohorts.',
    priority: 'Medium'
  },
  {
    title: 'Automate Low Value Service Flows',
    detail: 'Move low-value stable accounts to lower-cost service journeys while monitoring segment migration.',
    priority: 'Low'
  }
];

export const regressionModels: ModelRow[] = [
  { model: 'Linear Regression', rmse: 812, mae: 598, r2: 0.78 },
  { model: 'Ridge Regression', rmse: 774, mae: 575, r2: 0.81 },
  { model: 'Random Forest Regressor', rmse: 621, mae: 442, r2: 0.89 },
  { model: 'Gradient Boosting Regressor', rmse: 592, mae: 418, r2: 0.91 },
  { model: 'XGBoost Regressor', rmse: 566, mae: 401, r2: 0.92 }
];

export const classificationModels: ModelRow[] = [
  { model: 'Logistic Regression', accuracy: 0.83, precision: 0.78, recall: 0.75, f1: 0.76, rocAuc: 0.84 },
  { model: 'Random Forest Classifier', accuracy: 0.89, precision: 0.86, recall: 0.82, f1: 0.84, rocAuc: 0.9 },
  {
    model: 'Gradient Boosting Classifier',
    accuracy: 0.91,
    precision: 0.88,
    recall: 0.85,
    f1: 0.86,
    rocAuc: 0.92
  },
  { model: 'XGBoost Classifier', accuracy: 0.93, precision: 0.9, recall: 0.88, f1: 0.89, rocAuc: 0.94 }
];

export const featureImportance = [
  { feature: 'Earned Premium', importance: 0.21 },
  { feature: 'Net Loss Paid', importance: 0.2 },
  { feature: 'Renewal Probability', importance: 0.16 },
  { feature: 'Customer Tenure', importance: 0.11 },
  { feature: 'Payment Delay Days', importance: 0.1 },
  { feature: 'Claim Count', importance: 0.09 },
  { feature: 'Customer Satisfaction', importance: 0.07 },
  { feature: 'Credit Score', importance: 0.06 }
];

const shapFeatures = [
  'Earned Premium',
  'Net Loss Paid',
  'Renewal Probability',
  'Customer Tenure',
  'Payment Delay',
  'Claim Count',
  'Customer Satisfaction',
  'Credit Score'
];

export const shapGlobalImportance = featureImportance.map((item) => ({
  feature: item.feature,
  importance: item.importance,
  direction: ['Payment Delay', 'Claim Count', 'Net Loss Paid'].includes(item.feature) ? 'negative' : 'positive'
}));

export const shapSummaryScatter = shapFeatures.flatMap((feature, idx) =>
  Array.from({ length: 18 }, (_, pointIdx) => {
    const x = idx + 1;
    const raw = Math.sin((idx + 1) * (pointIdx + 1) * 0.42) * 0.9;
    return {
      feature,
      featureIndex: x,
      shapValue: Number(raw.toFixed(3)),
      featureValueBand: pointIdx % 2 === 0 ? 'High' : 'Low'
    };
  })
);

export const shapLocalContributions = [
  { feature: 'Earned Premium', value: '+420', effect: 420 },
  { feature: 'Renewal Probability', value: '+270', effect: 270 },
  { feature: 'Customer Tenure', value: '+135', effect: 135 },
  { feature: 'Customer Satisfaction', value: '+96', effect: 96 },
  { feature: 'Net Loss Paid', value: '-310', effect: -310 },
  { feature: 'Payment Delay', value: '-185', effect: -185 },
  { feature: 'Claim Count', value: '-140', effect: -140 }
];

export const shapNarrative = {
  whatIsShap: [
    'SHAP explains how each feature contributes to the model prediction for CLV.',
    'Positive SHAP values push predicted CLV upward; negative values pull it downward.',
    'This helps business users trust the model and design targeted customer actions.'
  ],
  interpretation: [
    'Higher earned premium and stronger renewal behavior are major positive CLV drivers.',
    'Frequent claims, high losses, and long payment delays consistently lower expected value.',
    'Customer-level local explanations help account managers justify specific retention decisions.'
  ]
};

export const confusionMatrix = [
  { label: 'True Positive', value: 842, tone: 'good' as const },
  { label: 'False Positive', value: 103, tone: 'neutral' as const },
  { label: 'False Negative', value: 91, tone: 'risk' as const },
  { label: 'True Negative', value: 1414, tone: 'good' as const }
];
