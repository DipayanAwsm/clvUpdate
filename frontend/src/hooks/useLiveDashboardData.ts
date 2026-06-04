import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../api/client';
import { useDashboardData } from './useDashboardData';
import type { DashboardDataBundle, FilterState } from '../types';

interface LivePayload {
  businessSummary?: Record<string, any>;
  edaSummary?: Record<string, any>;
  modelMetrics?: Record<string, any>;
  featureSelection?: Record<string, any>;
  metadata?: Record<string, any>;
  dashboardAnalytics?: Record<string, any>;
}

interface LiveDashboardResult {
  data: DashboardDataBundle;
  source: 'backend' | 'mock';
  loading: boolean;
  error: string | null;
}

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toFraction = (value: unknown) => {
  const numeric = toNumber(value, 0);
  return numeric > 1 ? numeric / 100 : numeric;
};

const prettifyModelName = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

const pickSelectedClassifierRow = (modelMetrics: Record<string, any> | undefined, selectedName: string) => {
  const rows = (modelMetrics?.classification || []) as Array<Record<string, any>>;
  if (!rows.length) return null;

  const exact = rows.find((row) => String(row.model || '') === selectedName);
  if (exact) return exact;

  const fuzzy = rows.find((row) => {
    const candidate = String(row.model || '').toLowerCase();
    return candidate.includes(selectedName.toLowerCase()) || selectedName.toLowerCase().includes(candidate);
  });

  return fuzzy || rows[0];
};

const buildConfusionMatrix = (selectedClassifier: Record<string, any> | null) => {
  const matrix = selectedClassifier?.confusion_matrix;
  if (!Array.isArray(matrix) || matrix.length < 2 || !Array.isArray(matrix[0]) || !Array.isArray(matrix[1])) {
    return null;
  }

  const tn = toNumber(matrix?.[0]?.[0]);
  const fp = toNumber(matrix?.[0]?.[1]);
  const fn = toNumber(matrix?.[1]?.[0]);
  const tp = toNumber(matrix?.[1]?.[1]);

  return [
    { label: 'True Positive', value: tp, tone: 'good' as const },
    { label: 'False Positive', value: fp, tone: 'neutral' as const },
    { label: 'False Negative', value: fn, tone: 'risk' as const },
    { label: 'True Negative', value: tn, tone: 'good' as const }
  ];
};

const buildFeatureImportance = (
  metadata: Record<string, any> | undefined,
  featureSelection: Record<string, any> | undefined,
  fallback: DashboardDataBundle
) => {
  const selectedFeatures =
    (metadata?.selected_features as string[] | undefined) ||
    (featureSelection?.summary?.final_shortlist as string[] | undefined) ||
    [];

  if (!selectedFeatures.length) return fallback.modelInsights.featureImportance;

  const topRanked = (featureSelection?.summary?.top_ranked || []) as Array<Record<string, any>>;
  const rankedMap = new Map<string, number>(
    topRanked.map((row) => [String(row.feature), toNumber(row.combined_score)])
  );

  const rawScores = selectedFeatures.slice(0, 8).map((feature, index) => {
    const score = rankedMap.get(feature);
    if (score && score > 0) return score;
    return Math.max(0.25 - index * 0.02, 0.05);
  });

  const maxScore = Math.max(...rawScores, 1);

  return selectedFeatures.slice(0, 8).map((feature, index) => ({
    feature,
    importance: Number((rawScores[index] / maxScore).toFixed(3))
  }));
};

const stateRowsFromEda = (edaSummary: Record<string, any> | undefined) => {
  const direct = edaSummary?.state_wise_summary?.rows;
  if (Array.isArray(direct) && direct.length) return direct as Array<Record<string, any>>;

  const nested = edaSummary?.eda_metrics?.state_wise_summary?.rows;
  if (Array.isArray(nested) && nested.length) return nested as Array<Record<string, any>>;

  return [] as Array<Record<string, any>>;
};

const formatSplitRatio = (trainRows: number, testRows: number) => {
  const total = trainRows + testRows;
  if (total <= 0) return 'n/a';
  const trainPct = Math.round((trainRows / total) * 100);
  const testPct = 100 - trainPct;
  return `${trainPct} / ${testPct}`;
};

const mergeWithLiveData = (fallback: DashboardDataBundle, live: LivePayload): DashboardDataBundle => {
  const merged: DashboardDataBundle = {
    ...fallback,
    executive: { ...fallback.executive },
    eda: { ...fallback.eda },
    modelInsights: { ...fallback.modelInsights },
    shap: { ...fallback.shap }
  };

  const stateRows = stateRowsFromEda(live.edaSummary);
  const totalPremium = stateRows.reduce((acc, row) => acc + toNumber(row.total_premium), 0);
  const totalLoss = stateRows.reduce((acc, row) => acc + toNumber(row.total_losses), 0);

  if (live.dashboardAnalytics?.available) {
    const dashboard = live.dashboardAnalytics;
    const executive = dashboard.executive || {};
    const eda = dashboard.eda || {};
    const channel = dashboard.channel_insights || dashboard.channelInsights || {};
    const shap = dashboard.shap || {};

    if (Array.isArray(executive.clvTrend) && executive.clvTrend.length) {
      merged.executive.clvTrend = executive.clvTrend.map((row: Record<string, any>) => ({
        year: toNumber(row.year),
        avgClv: toNumber(row.avgClv, toNumber(row.clv, 0)),
        totalClv: toNumber(row.totalClv, toNumber(row.clv, 0))
      }));
    }
    if (Array.isArray(executive.stateClvSnapshot) && executive.stateClvSnapshot.length) {
      merged.executive.stateClvSnapshot = executive.stateClvSnapshot
        .map((row: Record<string, any>) => ({
          state: String(row.state ?? row.name ?? 'Unknown'),
          avgClv: Number(toNumber(row.avgClv, toNumber(row.clv, 0)).toFixed(2))
        }))
        .sort((a, b) => Number(b.avgClv) - Number(a.avgClv));
    }
    if (Array.isArray(executive.segmentDistribution) && executive.segmentDistribution.length) {
      const normalizedSegmentDistribution = executive.segmentDistribution.map((row: Record<string, any>) => ({
        name: String(row.name),
        customers: toNumber(row.customers)
      }));
      merged.executive.segmentDistribution = normalizedSegmentDistribution;
      merged.segmentation.segmentDistribution = normalizedSegmentDistribution;
    }
    if (Array.isArray(executive.topRecommendations) && executive.topRecommendations.length) {
      merged.executive.topRecommendations = executive.topRecommendations;
    }
    if (Array.isArray(executive.takeaways) && executive.takeaways.length) {
      merged.executive.takeaways = executive.takeaways.map((item: unknown) => String(item));
    }

    if (Array.isArray(eda.premiumDistribution) && eda.premiumDistribution.length) {
      merged.eda.premiumDistribution = eda.premiumDistribution;
    }
    if (Array.isArray(eda.lossDistribution) && eda.lossDistribution.length) {
      merged.eda.lossDistribution = eda.lossDistribution;
    }
    if (Array.isArray(eda.clvDistribution) && eda.clvDistribution.length) {
      merged.eda.clvDistribution = eda.clvDistribution;
    }
    if (Array.isArray(eda.claimsDistribution) && eda.claimsDistribution.length) {
      merged.eda.claimsDistribution = eda.claimsDistribution;
    }
    if (Array.isArray(eda.stateDistribution) && eda.stateDistribution.length) {
      merged.eda.stateDistribution = eda.stateDistribution;
    }
    if (Array.isArray(eda.yearTrend) && eda.yearTrend.length) {
      merged.eda.yearTrend = eda.yearTrend;
      merged.executive.clvTrend = eda.yearTrend.map((row: Record<string, any>) => ({
        year: toNumber(row.year),
        avgClv: toNumber(row.avgClv, 0)
      }));
    }
    if (eda.categoryMix && typeof eda.categoryMix === 'object') {
      merged.eda.categoryMix = {
        agentChannel: Array.isArray(eda.categoryMix.agentChannel) ? eda.categoryMix.agentChannel : merged.eda.categoryMix.agentChannel,
        marketingChannel: Array.isArray(eda.categoryMix.marketingChannel) ? eda.categoryMix.marketingChannel : merged.eda.categoryMix.marketingChannel,
        paymentMethod: Array.isArray(eda.categoryMix.paymentMethod) ? eda.categoryMix.paymentMethod : merged.eda.categoryMix.paymentMethod,
        incomeBracket: Array.isArray(eda.categoryMix.incomeBracket) ? eda.categoryMix.incomeBracket : merged.eda.categoryMix.incomeBracket
      };
    }
    if (Array.isArray(eda.correlationHeatmap) && eda.correlationHeatmap.length) {
      merged.eda.correlationHeatmap = eda.correlationHeatmap;
    }
    if (Array.isArray(eda.stateWisePremium) && eda.stateWisePremium.length) {
      merged.eda.stateWisePremium = eda.stateWisePremium;
    }
    if (Array.isArray(eda.stateWiseLosses) && eda.stateWiseLosses.length) {
      merged.eda.stateWiseLosses = eda.stateWiseLosses;
    }
    if (Array.isArray(eda.stateWiseClaims) && eda.stateWiseClaims.length) {
      merged.eda.stateWiseClaims = eda.stateWiseClaims;
    }
    if (Array.isArray(eda.interpretation) && eda.interpretation.length) {
      merged.eda.interpretation = eda.interpretation.map((item: unknown) => String(item));
    }

    if (Array.isArray(channel.avgClvByMarketing) && channel.avgClvByMarketing.length) {
      merged.channelInsights.avgClvByMarketing = channel.avgClvByMarketing;
    }
    if (Array.isArray(channel.avgClvByAgent) && channel.avgClvByAgent.length) {
      merged.channelInsights.avgClvByAgent = channel.avgClvByAgent;
    }
    if (Array.isArray(channel.stateChannelMatrix) && channel.stateChannelMatrix.length) {
      merged.channelInsights.stateChannelMatrix = channel.stateChannelMatrix;
    }
    if (Array.isArray(channel.agentClusters) && channel.agentClusters.length) {
      merged.channelInsights.agentClusters = channel.agentClusters;
    }
    if (Array.isArray(channel.agentChannelClusters) && channel.agentChannelClusters.length) {
      merged.channelInsights.agentChannelClusters = channel.agentChannelClusters;
    }
    if (Array.isArray(channel.topAgents) && channel.topAgents.length) {
      merged.channelInsights.topAgents = channel.topAgents;
    }
    if (channel.agentClusterMethod && typeof channel.agentClusterMethod === 'object') {
      merged.channelInsights.agentClusterMethod = {
        columnUsed: String(
          channel.agentClusterMethod.columnUsed || merged.channelInsights.agentClusterMethod?.columnUsed || 'agentName'
        ),
        channelColumnUsed: String(
          channel.agentClusterMethod.channelColumnUsed ||
            merged.channelInsights.agentClusterMethod?.channelColumnUsed ||
            'agentChannel'
        ),
        metric: String(
          channel.agentClusterMethod.metric || merged.channelInsights.agentClusterMethod?.metric || 'Average CLV per Agent Name'
        ),
        algorithm: String(
          channel.agentClusterMethod.algorithm || merged.channelInsights.agentClusterMethod?.algorithm || 'kmeans'
        ),
        featureSpace: Array.isArray(channel.agentClusterMethod.featureSpace)
          ? channel.agentClusterMethod.featureSpace.map((item: unknown) => String(item))
          : merged.channelInsights.agentClusterMethod?.featureSpace || [],
        quantile33Threshold: toNumber(
          channel.agentClusterMethod.quantile33Threshold,
          merged.channelInsights.agentClusterMethod?.quantile33Threshold ?? 0
        ),
        quantile67Threshold: toNumber(
          channel.agentClusterMethod.quantile67Threshold,
          merged.channelInsights.agentClusterMethod?.quantile67Threshold ?? 0
        ),
        rules: {
          ...(merged.channelInsights.agentClusterMethod?.rules || {}),
          ...(channel.agentClusterMethod.rules || {})
        }
      };
    }
    if (channel.bestSource && typeof channel.bestSource === 'object') {
      merged.channelInsights.bestSource = {
        title: String(channel.bestSource.title || merged.channelInsights.bestSource.title),
        detail: String(channel.bestSource.detail || merged.channelInsights.bestSource.detail),
        priority:
          String(channel.bestSource.priority || merged.channelInsights.bestSource.priority) as
            | 'Critical'
            | 'High'
            | 'Medium'
            | 'Low'
      };
    }

    if (Array.isArray(shap.what_is_shap) && shap.what_is_shap.length) {
      merged.shap.whatIsShap = shap.what_is_shap.map((item: unknown) => String(item));
    }
    if (Array.isArray(shap.global_importance) && shap.global_importance.length) {
      merged.shap.globalImportance = shap.global_importance;
    }
    if (Array.isArray(shap.shap_summary_scatter) && shap.shap_summary_scatter.length) {
      merged.shap.shapSummaryScatter = shap.shap_summary_scatter;
    }
    if (Array.isArray(shap.local_contributions) && shap.local_contributions.length) {
      merged.shap.localContributions = shap.local_contributions;
    }
    if (Array.isArray(shap.positive_drivers) && shap.positive_drivers.length) {
      merged.shap.positiveDrivers = shap.positive_drivers;
    }
    if (Array.isArray(shap.negative_drivers) && shap.negative_drivers.length) {
      merged.shap.negativeDrivers = shap.negative_drivers;
    }
    if (Array.isArray(shap.interpretation) && shap.interpretation.length) {
      merged.shap.interpretation = shap.interpretation.map((item: unknown) => String(item));
    }
  }

  if (live.businessSummary) {
    const summary = live.businessSummary;

    merged.executive.kpis = merged.executive.kpis.map((kpi) => {
      switch (kpi.label) {
        case 'Total Customers':
          return { ...kpi, value: toNumber(summary.total_customers, kpi.value) };
        case 'total clv':
        case 'Total Predicted CLV':
          return {
            ...kpi,
            value: toNumber(summary.total_predicted_clv, kpi.value),
            calculation: 'clv= premim - loss'
          };
        case 'Raw average clv':
          return {
            ...kpi,
            value: toNumber(
              summary.average_clv_before_prediction ?? summary.average_predicted_clv,
              kpi.value
            ),
            calculation:
              'How calculated: average clv before prediction = mean(clv) across all filtered customers.'
          };
        case 'High Value Customer %':
          return { ...kpi, value: toFraction(summary.high_value_percentage) };
        case 'Total Profit':
          return {
            ...kpi,
            value: totalPremium ? totalPremium - totalLoss : toNumber(summary.total_predicted_clv, kpi.value)
          };
        case 'Total Loss':
          return { ...kpi, value: totalLoss || kpi.value };
        default:
          return kpi;
      }
    });

    if (stateRows.length && !live.dashboardAnalytics?.available) {
      merged.executive.stateClvSnapshot = stateRows
        .map((row) => ({
          state: String(row.state),
          avgClv: Number(
            toNumber(
              row.avg_clv ?? row.average_clv ?? row.avgClv,
              toNumber(row.total_premium) - toNumber(row.total_losses)
            ).toFixed(2)
          )
        }))
        .sort((a, b) => b.avgClv - a.avgClv);
    }

    merged.executive.takeaways = [
      `Live backend dataset loaded with ${toNumber(summary.total_customers).toLocaleString()} customers.`,
      `Average CLV from trained backend artifacts: ${toNumber(summary.average_predicted_clv).toFixed(2)}.`,
      `High-value share from production scoring output: ${toNumber(summary.high_value_percentage).toFixed(2)}%.`,
      stateRows.length
        ? `State-wise premium/loss/claims are pulled from backend EDA artifacts for manager review.`
        : `State-wise EDA rows were unavailable from backend in this run.`
    ];
  }

  if (live.edaSummary) {
    const profile = live.edaSummary.profile || {};
    const shape = profile.shape || {};
    const missingValues = profile.missing_values || {};
    const rows = toNumber(shape.rows, merged.eda.datasetSummary.rows);
    const columns = toNumber(shape.columns, merged.eda.datasetSummary.columns);

    const totalMissing = Object.values(missingValues).reduce((acc, value) => acc + toNumber(value), 0);
    const missingPct = rows > 0 && columns > 0 ? (totalMissing / (rows * columns)) * 100 : merged.eda.datasetSummary.missingPct;

    const missingOverview = Object.entries(missingValues)
      .map(([field, count]) => ({ field, missingPct: rows > 0 ? (toNumber(count) / rows) * 100 : 0 }))
      .sort((a, b) => b.missingPct - a.missingPct)
      .slice(0, 8);

    merged.eda.datasetSummary = {
      rows,
      columns,
      missingPct: Number(missingPct.toFixed(2)),
      categoricalFields: Array.isArray(live.edaSummary.eda_metrics?.categorical_columns)
        ? live.edaSummary.eda_metrics.categorical_columns.length
        : merged.eda.datasetSummary.categoricalFields,
      numericFields: Array.isArray(live.edaSummary.eda_metrics?.numeric_columns)
        ? live.edaSummary.eda_metrics.numeric_columns.length
        : merged.eda.datasetSummary.numericFields
    };

    const rawPreview = live.edaSummary.training_raw_preview;
    if (rawPreview && Array.isArray(rawPreview.columns) && Array.isArray(rawPreview.rows)) {
      merged.eda.trainingRawPreview = {
        sourceFile: rawPreview.source_file ? String(rawPreview.source_file) : null,
        columns: rawPreview.columns.map((col: unknown) => String(col)),
        rows: rawPreview.rows.slice(0, 5).map((row: unknown) => {
          if (!row || typeof row !== 'object') return {};
          const normalized: Record<string, string | number | boolean | null> = {};
          Object.entries(row as Record<string, unknown>).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              normalized[String(key)] = null;
            } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              normalized[String(key)] = value;
            } else {
              normalized[String(key)] = String(value);
            }
          });
          return normalized;
        }),
        rowCount: Math.min(5, Number(rawPreview.row_count ?? 5)),
        columnCount: Number(rawPreview.column_count ?? rawPreview.columns.length ?? 0)
      };
    }

    if (missingOverview.length) {
      merged.eda.missingOverview = missingOverview.map((item) => ({
        field: item.field,
        missingPct: Number(item.missingPct.toFixed(2))
      }));
    }

    if (stateRows.length && !live.dashboardAnalytics?.available) {
      merged.eda.stateWisePremium = stateRows.map((row) => ({
        state: String(row.state),
        totalPremium: Number(toNumber(row.total_premium).toFixed(2))
      }));

      merged.eda.stateWiseLosses = stateRows.map((row) => ({
        state: String(row.state),
        totalLosses: Number(toNumber(row.total_losses).toFixed(2))
      }));

      merged.eda.stateWiseClaims = stateRows.map((row) => ({
        state: String(row.state),
        totalClaimCount: Number(toNumber(row.total_claim_count).toFixed(0))
      }));

      merged.eda.stateDistribution = stateRows.map((row) => ({
        name: String(row.state),
        customers: Number(toNumber(row.total_claim_count))
      }));
    }

    if (Array.isArray(live.edaSummary.key_findings) && live.edaSummary.key_findings.length) {
      merged.eda.interpretation = live.edaSummary.key_findings.map((item: unknown) => String(item));
    }
  }

  if (live.modelMetrics) {
    const regressionRows = (live.modelMetrics.regression || []) as Array<Record<string, any>>;
    const classificationRows = (live.modelMetrics.classification || []) as Array<Record<string, any>>;

    if (regressionRows.length) {
      merged.modelInsights.regressionModels = regressionRows.map((row) => ({
        model: prettifyModelName(String(row.model || 'Unknown')),
        r2: toNumber(row.r2),
        mae: toNumber(row.mae),
        rmse: toNumber(row.rmse)
      }));
    }

    if (classificationRows.length) {
      merged.modelInsights.classificationModels = classificationRows.map((row) => ({
        model: prettifyModelName(String(row.model || 'Unknown')),
        accuracy: toNumber(row.accuracy),
        precision: toNumber(row.precision),
        recall: toNumber(row.recall),
        f1: toNumber(row.f1),
        rocAuc: toNumber(row.roc_auc ?? row.rocAuc)
      }));
    }

    merged.modelInsights.selectedRegression = prettifyModelName(
      String(
        live.metadata?.regression_model_selected ||
          live.modelMetrics.selected_regression_model ||
          merged.modelInsights.selectedRegression
      )
    );

    merged.modelInsights.selectedClassification = prettifyModelName(
      String(
        live.metadata?.classification_model_selected ||
          live.modelMetrics.selected_classification_model ||
          merged.modelInsights.selectedClassification
      )
    );

    const selectedClassifier = pickSelectedClassifierRow(
      live.modelMetrics,
      String(
        live.metadata?.classification_model_selected ||
          live.modelMetrics.selected_classification_model ||
          ''
      )
    );

    const confusionMatrix = buildConfusionMatrix(selectedClassifier);
    if (confusionMatrix) {
      merged.modelInsights.confusionMatrix = confusionMatrix;
    }
  }

  if (live.featureSelection || live.metadata) {
    merged.modelInsights.featureImportance = buildFeatureImportance(live.metadata, live.featureSelection, fallback);

    const notes = (live.metadata?.notes || live.featureSelection?.summary?.selection_notes || []) as unknown[];
    if (notes.length) {
      merged.modelInsights.rationale = notes.slice(0, 3).map((note) => String(note));
    }
  }

  if (live.metadata) {
    const metadata = live.metadata;
    const selectedFeatures = Array.isArray(metadata.selected_features)
      ? metadata.selected_features.map((item: unknown) => String(item))
      : [];

    const trainRows = toNumber(metadata.train_rows, merged.modelInsights.trainingDetails.trainRows);
    const testRows = toNumber(metadata.test_rows, merged.modelInsights.trainingDetails.testRows);

    merged.modelInsights.trainingDetails = {
      dataSource: String(metadata.data_source || merged.modelInsights.trainingDetails.dataSource),
      datasetType: String(metadata.dataset_type || merged.modelInsights.trainingDetails.datasetType),
      targetColumn: String(metadata.target_column || merged.modelInsights.trainingDetails.targetColumn),
      targetFormula: String(
        metadata.target_definition?.formula || merged.modelInsights.trainingDetails.targetFormula
      ),
      highValueQuantile: toNumber(
        metadata.high_value_quantile ?? metadata.target_definition?.high_value_quantile,
        merged.modelInsights.trainingDetails.highValueQuantile
      ),
      highValueThreshold: toNumber(
        metadata.high_value_threshold_value ?? metadata.target_definition?.high_value_threshold,
        merged.modelInsights.trainingDetails.highValueThreshold
      ),
      trainRows,
      testRows,
      splitRatio: formatSplitRatio(trainRows, testRows),
      classificationTarget: String(
        metadata.classification_target_column || merged.modelInsights.trainingDetails.classificationTarget
      ),
      selectedFeatureCount: selectedFeatures.length || merged.modelInsights.trainingDetails.selectedFeatureCount,
      selectedFeatures: selectedFeatures.length
        ? selectedFeatures
        : merged.modelInsights.trainingDetails.selectedFeatures,
      mlflowRunId: metadata.mlflow?.run_id ? String(metadata.mlflow.run_id) : null,
      notes: Array.isArray(metadata.notes)
        ? metadata.notes.map((note: unknown) => String(note))
        : merged.modelInsights.trainingDetails.notes
    };
  }

  return merged;
};

export const useLiveDashboardData = (filters: FilterState): LiveDashboardResult => {
  const fallback = useDashboardData(filters);

  const [live, setLive] = useState<LivePayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const stateQuery = encodeURIComponent(filters.states.join(','));
      const yearQuery = encodeURIComponent(filters.years.join(','));
      const dashboardAnalyticsPath = `/dashboard-analytics?states=${stateQuery}&years=${yearQuery}`;

      const responses = await Promise.allSettled([
        apiClient.get<Record<string, any>>('/business/summary'),
        apiClient.get<Record<string, any>>('/eda-summary'),
        apiClient.get<Record<string, any>>('/model-metrics'),
        apiClient.get<Record<string, any>>('/feature-selection-summary'),
        apiClient.get<Record<string, any>>('/metadata'),
        apiClient.get<Record<string, any>>(dashboardAnalyticsPath)
      ]);

      if (!mounted) return;

      const [business, eda, model, featureSelection, metadata, dashboardAnalytics] = responses;

      const next: LivePayload = {
        businessSummary: business.status === 'fulfilled' ? business.value : undefined,
        edaSummary: eda.status === 'fulfilled' ? eda.value : undefined,
        modelMetrics: model.status === 'fulfilled' ? model.value : undefined,
        featureSelection: featureSelection.status === 'fulfilled' ? featureSelection.value : undefined,
        metadata: metadata.status === 'fulfilled' ? metadata.value : undefined,
        dashboardAnalytics: dashboardAnalytics.status === 'fulfilled' ? dashboardAnalytics.value : undefined
      };

      setLive(next);

      const allFailed = responses.every((result) => result.status === 'rejected');
      if (allFailed) {
        setError('Backend API unavailable. Showing demo mock data.');
      }

      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [filters.states, filters.years]);

  const hasBackendData = useMemo(
    () =>
      Boolean(
        live.businessSummary ||
          live.edaSummary ||
          live.modelMetrics ||
          live.featureSelection ||
          live.metadata ||
          live.dashboardAnalytics
      ),
    [live]
  );

  const data = useMemo(() => {
    if (!hasBackendData) return fallback;
    return mergeWithLiveData(fallback, live);
  }, [fallback, hasBackendData, live]);

  return {
    data,
    source: hasBackendData ? 'backend' : 'mock',
    loading,
    error
  };
};
