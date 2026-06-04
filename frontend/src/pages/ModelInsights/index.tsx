import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import ChartCard from '../../components/charts/ChartCard';
import SectionHeader from '../../components/common/SectionHeader';
import DataTable from '../../components/tables/DataTable';
import type { DashboardDataBundle, ModelRow } from '../../types';
import { formatNumber, formatPercent } from '../../utils/format';

interface ModelInsightsProps {
  data: DashboardDataBundle;
}

const toneMap: Record<'good' | 'neutral' | 'risk', string> = {
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  neutral: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  risk: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
};

const featureSelectionMethods = [
  {
    method: 'Correlation Screening',
    output: 'Removed redundant variables and retained signal-rich features tied to CLV direction.',
    focus: 'Stability and multicollinearity control'
  },
  {
    method: 'Mutual Information',
    output: 'Captured non-linear relationship strength between inputs and target outcomes.',
    focus: 'Non-linear signal detection'
  },
  {
    method: 'RFECV (Recursive Feature Elimination)',
    output: 'Iteratively pruned weak predictors and validated optimal subset with cross-validation.',
    focus: 'Generalization on holdout data'
  },
  {
    method: 'Tree-Based Feature Importance',
    output: 'Validated practical business drivers used by ensemble models for final scoring.',
    focus: 'Interpretability and operational relevance'
  },
  {
    method: 'L1 Regularization (Optional)',
    output: 'Applied sparsity pressure to confirm robust predictors under linear constraints.',
    focus: 'Compact feature set verification'
  }
];

const ModelInsights = ({ data }: ModelInsightsProps) => {
  const training = data.modelInsights.trainingDetails;

  const regressionColumns = [
    { key: 'model', label: 'Model' },
    {
      key: 'rmse',
      label: 'RMSE',
      render: (row: ModelRow) => formatNumber(Number(row.rmse || 0), 0)
    },
    {
      key: 'mae',
      label: 'MAE',
      render: (row: ModelRow) => formatNumber(Number(row.mae || 0), 0)
    },
    {
      key: 'r2',
      label: 'R2',
      render: (row: ModelRow) => formatNumber(Number(row.r2 || 0), 2)
    }
  ];

  const classificationColumns = [
    { key: 'model', label: 'Model' },
    { key: 'accuracy', label: 'Accuracy', render: (row: ModelRow) => formatPercent(Number(row.accuracy || 0), 1) },
    {
      key: 'precision',
      label: 'Precision',
      render: (row: ModelRow) => formatPercent(Number(row.precision || 0), 1)
    },
    { key: 'recall', label: 'Recall', render: (row: ModelRow) => formatPercent(Number(row.recall || 0), 1) },
    { key: 'f1', label: 'F1', render: (row: ModelRow) => formatPercent(Number(row.f1 || 0), 1) },
    { key: 'rocAuc', label: 'ROC-AUC', render: (row: ModelRow) => formatNumber(Number(row.rocAuc || 0), 2) }
  ];

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Model Insights"
        subtitle="Model Performance and Selection"
        question="Which models performed best for CLV prediction and high-value customer identification?"
        takeaway="The selected models maximize prediction quality while preserving clear business interpretability and actionability."
      />

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Training Run Details</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Live metadata from the latest training pipeline run, including dataset source, split, target definition, and model context.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Dataset Type</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{training.datasetType}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Train/Test Split</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatNumber(training.trainRows)} / {formatNumber(training.testRows)} ({training.splitRatio})
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">High-Value Cutoff</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Q{formatNumber(training.highValueQuantile, 2)} ({formatNumber(training.highValueThreshold, 3)})
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Selected Features</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatNumber(training.selectedFeatureCount)}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Input Source File</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-200">{training.dataSource}</p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Target Definition</p>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
              Column: <span className="font-semibold">{training.targetColumn}</span>
            </p>
            <p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-200">{training.targetFormula}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Classification Target</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{training.classificationTarget}</p>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">MLflow Run ID</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-200">
              {training.mlflowRunId || 'n/a'}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-brand-50 p-3 dark:bg-slate-800">
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-100">Feature shortlist used for training</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {training.selectedFeatures.map((feature) => (
              <span key={feature} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Training Notes</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {training.notes.slice(0, 8).map((note) => (
              <li key={note} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-brand-500" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Regression Model Metrics</h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Selected: {data.modelInsights.selectedRegression}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            RMSE and MAE reflect error magnitude; R2 shows explained variance for CLV predictions.
          </p>
          <div className="mt-3">
            <DataTable columns={regressionColumns as any} rows={data.modelInsights.regressionModels as any} />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Classification Model Metrics</h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Selected: {data.modelInsights.selectedClassification}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Precision and recall are prioritized to avoid missing high-value customers that need retention focus.
          </p>
          <div className="mt-3">
            <DataTable columns={classificationColumns as any} rows={data.modelInsights.classificationModels as any} />
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Regression Comparison"
          subtitle="Error and fit quality"
          helperText="Lower RMSE/MAE and higher R2 indicate stronger CLV prediction performance."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.modelInsights.regressionModels}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rmse" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar dataKey="mae" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Classification Comparison"
          subtitle="Target detection quality"
          helperText="Accuracy, precision, recall, and F1 jointly show how reliably premium customers are identified."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.modelInsights.classificationModels}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatPercent(Number(value), 1)} />
              <Bar dataKey="accuracy" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="precision" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="recall" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="f1" fill="#0d9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Feature Importance"
          subtitle="Top CLV drivers used by the model"
          helperText="Higher importance indicates stronger contribution to prediction quality in the selected model family."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.modelInsights.featureImportance} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="feature" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatPercent(Number(value), 1)} />
              <Bar dataKey="importance" fill="#6366f1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Confusion Matrix Snapshot</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Classification quality for high-value customer detection across correct and incorrect prediction buckets.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.modelInsights.confusionMatrix.map((cell) => (
              <div key={cell.label} className={`rounded-xl px-3 py-3 ${toneMap[cell.tone]}`}>
                <p className="text-xs uppercase tracking-wide">{cell.label}</p>
                <p className="mt-1 text-2xl font-bold">{formatNumber(cell.value)}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Feature Selection Framework</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Multiple feature selection methods were combined to avoid overfitting and preserve business interpretability.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {featureSelectionMethods.map((method) => (
            <div key={method.method} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{method.method}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{method.output}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-600">{method.focus}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-brand-50 p-3 dark:bg-slate-800">
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-100">Final shortlisted features</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.modelInsights.featureImportance.slice(0, 8).map((item) => (
              <span key={item.feature as string} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {String(item.feature)}
              </span>
            ))}
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Why We Selected the Final Models</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {data.modelInsights.rationale.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
};

export default ModelInsights;
