import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import ChartCard from '../../components/charts/ChartCard';
import CorrelationHeatmap from '../../components/charts/CorrelationHeatmap';
import InsightCard from '../../components/cards/InsightCard';
import SectionHeader from '../../components/common/SectionHeader';
import type { DashboardDataBundle } from '../../types';

interface EDAOverviewProps {
  data: DashboardDataBundle;
}

const piePalette = ['#2563eb', '#0ea5e9', '#06b6d4', '#22c55e', '#f59e0b', '#f97316'];

const EDAOverview = ({ data }: EDAOverviewProps) => {
  const { datasetSummary } = data.eda;
  const previewColumns = data.eda.trainingRawPreview.columns;
  const previewRows = data.eda.trainingRawPreview.rows.slice(0, 5);
  const stateWiseAveragePremium = data.eda.stateWisePremium.map((row) => ({
    ...row,
    avgPremium: Number((row as Record<string, number>).avgPremium ?? (row as Record<string, number>).totalPremium ?? 0)
  }));
  const stateWiseAverageLosses = data.eda.stateWiseLosses.map((row) => ({
    ...row,
    avgLosses: Number((row as Record<string, number>).avgLosses ?? (row as Record<string, number>).totalLosses ?? 0)
  }));

  const formatCell = (value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'number') {
      return Number.isInteger(value)
        ? value.toLocaleString()
        : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(value);
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        title="EDA Overview"
        subtitle="Base Data Readiness"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500">Rows</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{datasetSummary.rows.toLocaleString()}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500">Columns</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{datasetSummary.columns.toLocaleString()}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500">Categorical Fields</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{datasetSummary.categoricalFields}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500">Numeric Fields</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{datasetSummary.numericFields}</p>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Training Raw Dataset Preview (5 Rows x All Columns)
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          This is a direct sample from the training raw dataset used in the CLV pipeline.
        </p>
        {data.eda.trainingRawPreview.sourceFile ? (
          <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
            Source: {data.eda.trainingRawPreview.sourceFile}
          </p>
        ) : null}

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                {previewColumns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-100">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.length ? (
                previewRows.map((row, rowIndex) => (
                  <tr key={`preview-row-${rowIndex}`} className="border-t border-slate-200 dark:border-slate-700">
                    {previewColumns.map((column) => (
                      <td key={`${rowIndex}-${column}`} className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-200">
                        {formatCell(row[column])}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={Math.max(previewColumns.length, 1)}>
                    No training raw preview is available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <div className="grid gap-4">
        <ChartCard
          title="State Distribution"
          subtitle="Where policies are concentrated"
          helperText="State volume helps interpret whether value and risk shifts are exposure-driven or behavior-driven."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.eda.stateDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="customers" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="State-wise average Premium"
          subtitle="Average premium by state"
          helperText="Compares average earned premium by state for apples-to-apples portfolio quality comparison."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stateWiseAveragePremium}>
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgPremium" fill="#0284c7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="State-wise average Losses"
          subtitle="Average losses by state"
          helperText="Highlights average loss intensity by state to isolate risk quality beyond pure volume."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stateWiseAverageLosses}>
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgLosses" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="State-wise Claim Count"
          subtitle="Claims by state"
          helperText="Tracks claim frequency by geography to support risk-focused servicing and pricing strategy."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.eda.stateWiseClaims}>
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalClaimCount" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Year Trend"
          subtitle="Premium, loss, and CLV over time"
          helperText="Compares how value and cost structure changed by policy year."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.eda.yearTrend}>
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="avgPremium" stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="avgLoss" stroke="#f97316" strokeWidth={2} />
              <Line type="monotone" dataKey="avgClv" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Claims Count Distribution"
          subtitle="How claim frequency is spread"
          helperText="Higher claim count cohorts typically map to lower profitability and higher CLV volatility."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.eda.claimsDistribution}>
              <XAxis dataKey="claims" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="customers" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Correlation Heatmap"
        subtitle="How key variables move together"
        helperText="Correlation is directional insight, not causation. Use this for hypothesis generation and feature framing."
      >
        <CorrelationHeatmap data={data.eda.correlationHeatmap as Array<{ x: string; y: string; value: number }>} />
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-4">
        <ChartCard title="AGENT_CHANNEL Mix" subtitle="Distribution" helperText="Shows portfolio contribution by agent channel.">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.eda.categoryMix.agentChannel} dataKey="customers" nameKey="name" outerRadius={90}>
                {data.eda.categoryMix.agentChannel.map((_, index) => (
                  <Cell key={index} fill={piePalette[index % piePalette.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="MarketingChannel Mix"
          subtitle="Distribution"
          helperText="Compares acquisition source share in the filtered view."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.eda.categoryMix.marketingChannel}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="customers" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="PaymentMethod Mix"
          subtitle="Distribution"
          helperText="Payment method behavior can influence delinquency and retention outcomes."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.eda.categoryMix.paymentMethod}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="customers" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="IncomeBracket Mix"
          subtitle="Distribution"
          helperText="Income mix helps contextualize expected spend and risk tolerance."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.eda.categoryMix.incomeBracket}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="customers" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <InsightCard title="What This EDA Tells Us" points={data.eda.interpretation} />
    </section>
  );
};

export default EDAOverview;
