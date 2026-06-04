import type { ComponentType } from 'react';

export type SegmentLabel =
  | 'High Value, Low Risk'
  | 'High Value, High Risk'
  | 'Growth Potential'
  | 'Low Value'
  | 'Loss Making';

export interface CustomerRecord {
  customerId: string;
  state: string;
  year: number;
  earnedPremium: number;
  netLossPaid: number;
  claimCount: number;
  clv: number;
  profit: number;
  lossRatio: number;
  segment: SegmentLabel;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  marketingChannel: string;
  agentChannel: string;
  paymentMethod: string;
  incomeBracket: string;
  paymentDelayDays: number;
  customerSatisfaction: number;
  renewalProbability: number;
  creditScore: number;
  customerTenure: number;
  deductible: number;
  coverageAmount: number;
  discountRate: number;
  complaintCount: number;
  delinquencyFlag: number;
  hazardScore: number;
  agentExperienceYears: number;
  highValueProbability: number;
  highValueFlag: number;
}

export interface FilterState {
  states: string[];
  years: number[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface KPIItem {
  label: string;
  value: number;
  delta: number;
  explanation: string;
  calculation?: string;
  format: 'currency' | 'number' | 'percent';
}

export interface RecommendationItem {
  title: string;
  detail: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface PredictionInput {
  state: string;
  year: number;
  earnedPremium: number;
  netLossPaid: number;
  customerTenure: number;
  creditScore: number;
  paymentDelayDays: number;
  customerSatisfaction: number;
  claimCount: number;
  deductible: number;
  coverageAmount: number;
  marketingChannel: string;
  agentExperienceYears: number;
  discountRate: number;
}

export interface PredictionOutput {
  predictedClv: number;
  highValueProbability: number;
  highValueFlag: number;
  segment: SegmentLabel;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendedAction: string;
}

export interface ChartPoint {
  [key: string]: string | number;
}

export interface ModelRow {
  model: string;
  rmse?: number;
  mae?: number;
  r2?: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  rocAuc?: number;
}

export interface DashboardDataBundle {
  records: CustomerRecord[];
  executive: {
    kpis: KPIItem[];
    clvTrend: ChartPoint[];
    stateClvSnapshot: ChartPoint[];
    segmentDistribution: ChartPoint[];
    topRecommendations: RecommendationItem[];
    takeaways: string[];
  };
  eda: {
    datasetSummary: Record<string, number>;
    trainingRawPreview: {
      sourceFile: string | null;
      columns: string[];
      rows: Array<Record<string, string | number | boolean | null>>;
      rowCount: number;
      columnCount: number;
    };
    missingOverview: ChartPoint[];
    premiumDistribution: ChartPoint[];
    lossDistribution: ChartPoint[];
    clvDistribution: ChartPoint[];
    claimsDistribution: ChartPoint[];
    stateDistribution: ChartPoint[];
    yearTrend: ChartPoint[];
    categoryMix: {
      agentChannel: ChartPoint[];
      marketingChannel: ChartPoint[];
      paymentMethod: ChartPoint[];
      incomeBracket: ChartPoint[];
    };
    correlationHeatmap: ChartPoint[];
    stateWisePremium: ChartPoint[];
    stateWiseLosses: ChartPoint[];
    stateWiseClaims: ChartPoint[];
    interpretation: string[];
  };
  segmentation: {
    segmentDistribution: ChartPoint[];
    clvRiskScatter: ChartPoint[];
    segmentProfit: ChartPoint[];
    segmentRenewal: ChartPoint[];
    topCustomers: CustomerRecord[];
    highRiskHighValue: CustomerRecord[];
    actionSummary: RecommendationItem[];
  };
  riskProfitability: {
    lossRatioByState: ChartPoint[];
    lossRatioBySegment: ChartPoint[];
    paymentDelayVsClv: ChartPoint[];
    delinquencyVsRenewal: ChartPoint[];
    claimCountVsProfit: ChartPoint[];
    complaintVsClv: ChartPoint[];
    hazardImpact: ChartPoint[];
  };
  channelInsights: {
    avgClvByMarketing: ChartPoint[];
    avgClvByAgent: ChartPoint[];
    renewalByMarketing: ChartPoint[];
    profitabilityByChannel: ChartPoint[];
    agentExpVsClv: ChartPoint[];
    stateChannelMatrix: ChartPoint[];
    agentClusters: ChartPoint[];
    agentChannelClusters: ChartPoint[];
    topAgents: ChartPoint[];
    agentClusterMethod?: {
      columnUsed: string;
      channelColumnUsed?: string;
      metric: string;
      algorithm?: string;
      featureSpace?: string[];
      quantile33Threshold: number;
      quantile67Threshold: number;
      rules: Record<string, string>;
    };
    bestSource: RecommendationItem;
  };
  modelInsights: {
    regressionModels: ModelRow[];
    classificationModels: ModelRow[];
    selectedRegression: string;
    selectedClassification: string;
    featureImportance: ChartPoint[];
    confusionMatrix: { label: string; value: number; tone: 'good' | 'neutral' | 'risk' }[];
    rationale: string[];
    trainingDetails: {
      dataSource: string;
      datasetType: string;
      targetColumn: string;
      targetFormula: string;
      highValueQuantile: number;
      highValueThreshold: number;
      trainRows: number;
      testRows: number;
      splitRatio: string;
      classificationTarget: string;
      selectedFeatureCount: number;
      selectedFeatures: string[];
      mlflowRunId: string | null;
      notes: string[];
    };
  };
  shap: {
    whatIsShap: string[];
    globalImportance: ChartPoint[];
    shapSummaryScatter: ChartPoint[];
    localContributions: ChartPoint[];
    positiveDrivers: ChartPoint[];
    negativeDrivers: ChartPoint[];
    interpretation: string[];
  };
}
