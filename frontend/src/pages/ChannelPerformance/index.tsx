import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from 'recharts';

import RecommendationCard from '../../components/cards/RecommendationCard';
import ChartCard from '../../components/charts/ChartCard';
import SectionHeader from '../../components/common/SectionHeader';
import DataTable from '../../components/tables/DataTable';
import type { DashboardDataBundle } from '../../types';
import { formatCurrency } from '../../utils/format';

interface ChannelPerformanceProps {
  data: DashboardDataBundle;
}

interface AgentTableRow {
  agentName: string;
  channel: string;
  avgClv: number;
  customers: number;
  cluster: string;
}

const ChannelPerformance = ({ data }: ChannelPerformanceProps) => {
  const states = Array.from(new Set(data.channelInsights.stateChannelMatrix.map((item) => String(item.state))));
  const channels = Array.from(new Set(data.channelInsights.stateChannelMatrix.map((item) => String(item.channel))));
  const matrixClvValues = data.channelInsights.stateChannelMatrix.map((item) => Number(item.avgClv));
  const maxClv = matrixClvValues.length ? Math.max(...matrixClvValues) : 1;
  const clusterTone: Record<string, string> = {
    'Best Set': '#059669',
    'Core Cohort': '#0ea5e9',
    'Support Cohort': '#94a3b8'
  };
  const clusterMethod = data.channelInsights.agentClusterMethod;

  const getCellTone = (value: number) => {
    const intensity = value / Math.max(maxClv, 1);
    if (intensity > 0.85) return 'bg-emerald-600 text-white';
    if (intensity > 0.7) return 'bg-emerald-400 text-emerald-950';
    if (intensity > 0.55) return 'bg-emerald-200 text-emerald-900';
    if (intensity > 0.4) return 'bg-sky-200 text-sky-900';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  };

  const getMatrixValue = (state: string, channel: string) => {
    const row = data.channelInsights.stateChannelMatrix.find((item) => item.state === state && item.channel === channel);
    return Number(row?.avgClv || 0);
  };

  const topAgentRows: AgentTableRow[] = data.channelInsights.topAgents.map((row) => ({
    agentName: String(row.agentName || 'Unknown'),
    channel: String(row.channel || 'Unknown'),
    avgClv: Number(row.avgClv || 0),
    customers: Number(row.customers || 0),
    cluster: String(row.cluster || 'Support Cohort')
  }));
  const bestSetRows = topAgentRows.filter((row) => row.cluster === 'Best Set');
  const displayedAgentRows = bestSetRows.length ? bestSetRows : topAgentRows;
  const clusteredPlotRows: AgentTableRow[] = (
    data.channelInsights.agentChannelClusters.length
      ? data.channelInsights.agentChannelClusters
      : displayedAgentRows
  ).map((row) => ({
    agentName: String(row.agentName || 'Unknown'),
    channel: String(row.channel || 'Unknown'),
    avgClv: Number(row.avgClv || 0),
    customers: Number(row.customers || 0),
    cluster: String(row.cluster || 'Support Cohort')
  }));

  const downloadAgentsCsv = (cluster?: 'Best Set' | 'Core Cohort' | 'Support Cohort') => {
    const sourceRows = clusteredPlotRows.length ? clusteredPlotRows : displayedAgentRows;
    const exportRows = cluster ? sourceRows.filter((row) => row.cluster === cluster) : sourceRows;
    if (!exportRows.length) return;

    const headers = ['rank', 'agentName', 'channel', 'avgClv', 'customers', 'cluster'];
    const lines = exportRows.map((row, idx) =>
      [idx + 1, row.agentName, row.channel, row.avgClv.toFixed(2), row.customers, row.cluster]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = cluster
      ? `${cluster.toLowerCase().replaceAll(' ', '_')}_agents_by_clv.csv`
      : 'all_agent_clusters_by_clv.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Channel Insights"
        subtitle="Acquisition and Distribution Quality"
        question="Which channels bring high-value customers and where should acquisition spend be concentrated?"
        takeaway="Channel and agent-name CLV patterns show where to scale acquisition and which agents should be prioritized for premium portfolios."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Average CLV by Marketing Channel"
          subtitle="Acquisition quality"
          helperText="Not all channels produce equal value. Use this to prioritize spend toward stronger CLV sources."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.channelInsights.avgClvByMarketing}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              <Bar dataKey="avgClv" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Average CLV by AGENT_CHANNEL"
          subtitle="Distribution partner quality"
          helperText="Agent channel quality helps align partner strategy with long-term value outcomes."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.channelInsights.avgClvByAgent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              <Bar dataKey="avgClv" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Agent Name-wise CLV Clustering"
          subtitle="Best Set, Core Cohort, and Support Cohort by average CLV"
          helperText="Agents are grouped using K-Means on CLV/volume/channel features (with quantile fallback), so business teams can focus on the strongest cohorts."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.channelInsights.agentClusters}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cluster" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              <Bar dataKey="avgClv" radius={[6, 6, 0, 0]}>
                {data.channelInsights.agentClusters.map((row, idx) => (
                  <Cell
                    key={`cluster-bar-${idx}`}
                    fill={clusterTone[String(row.cluster)] || '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">How Agent Clustering Is Calculated</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Algorithm: <span className="font-medium text-slate-800 dark:text-slate-200">{clusterMethod?.algorithm || 'kmeans'}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Metric: <span className="font-medium text-slate-800 dark:text-slate-200">{clusterMethod?.metric || 'Average CLV per Agent Name'}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Agent column used: <span className="font-medium text-slate-800 dark:text-slate-200">{clusterMethod?.columnUsed || 'agentName'}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Channel column used: <span className="font-medium text-slate-800 dark:text-slate-200">{clusterMethod?.channelColumnUsed || 'agentChannel'}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Quantile 33 threshold: <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(Number(clusterMethod?.quantile33Threshold || 0))}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Quantile 67 threshold: <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(Number(clusterMethod?.quantile67Threshold || 0))}</span>
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p><span className="font-semibold text-emerald-700 dark:text-emerald-300">Best Set:</span> {clusterMethod?.rules?.['Best Set'] || 'agent_avg_clv >= quantile_67'}</p>
            <p><span className="font-semibold text-sky-700 dark:text-sky-300">Core Cohort:</span> {clusterMethod?.rules?.['Core Cohort'] || 'quantile_33 <= agent_avg_clv < quantile_67'}</p>
            <p><span className="font-semibold text-slate-700 dark:text-slate-200">Support Cohort:</span> {clusterMethod?.rules?.['Support Cohort'] || 'agent_avg_clv < quantile_33'}</p>
          </div>
        </article>
      </div>

      <ChartCard
        title="Best Agents with High CLV by Channel (Cluster Map)"
        subtitle="K-Means cluster view by agent and channel"
        helperText="Each point is an agent. X-axis shows average CLV, Y-axis shows customer volume, color shows cluster, and tooltip shows channel."
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="avgClv" name="Average CLV" tick={{ fontSize: 11 }} />
            <YAxis dataKey="customers" name="Customers" tick={{ fontSize: 11 }} />
            <ZAxis dataKey="customers" range={[40, 190]} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'Average CLV' || name === 'avgClv') return formatCurrency(Number(value));
                return Number(value).toLocaleString();
              }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as AgentTableRow;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow dark:border-slate-700 dark:bg-slate-900">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{row.agentName}</p>
                    <p className="text-slate-600 dark:text-slate-300">Channel: {row.channel}</p>
                    <p className="text-slate-600 dark:text-slate-300">Cluster: {row.cluster}</p>
                    <p className="text-slate-600 dark:text-slate-300">Average CLV: {formatCurrency(row.avgClv)}</p>
                    <p className="text-slate-600 dark:text-slate-300">Customers: {row.customers.toLocaleString()}</p>
                  </div>
                );
              }}
            />
            <Legend />
            {(['Best Set', 'Core Cohort', 'Support Cohort'] as const).map((cluster) => (
              <Scatter
                key={cluster}
                name={cluster}
                data={clusteredPlotRows.filter((row) => row.cluster === cluster)}
                fill={clusterTone[cluster]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Best Set of Agents by Average CLV</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadAgentsCsv('Best Set')}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-slate-800 dark:text-emerald-200 dark:hover:bg-slate-700"
              >
                Download Best Set
              </button>
              <button
                type="button"
                onClick={() => downloadAgentsCsv('Core Cohort')}
                className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-700/40 dark:bg-slate-800 dark:text-sky-200 dark:hover:bg-slate-700"
              >
                Download Core Cohort
              </button>
              <button
                type="button"
                onClick={() => downloadAgentsCsv('Support Cohort')}
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Download Support Cohort
              </button>
              <button
                type="button"
                onClick={() => downloadAgentsCsv()}
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-700/40 dark:bg-slate-800 dark:text-brand-200 dark:hover:bg-slate-700"
              >
                Download All Clusters
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Ranked agent list for manager actioning. Focus retention and premium routing on top average-CLV agents.
          </p>
          <div className="mt-3">
            <DataTable
              columns={[
                { key: 'rank', label: 'Rank' },
                { key: 'agentName', label: 'Agent Name' },
                {
                  key: 'avgClv',
                  label: 'Average CLV',
                  render: (row) => formatCurrency(Number(row.avgClv || 0))
                },
                { key: 'channel', label: 'Channel' },
                {
                  key: 'customers',
                  label: 'Customers',
                  render: (row) => Number(row.customers || 0).toLocaleString()
                },
                { key: 'cluster', label: 'Cluster' }
              ]}
              rows={displayedAgentRows.map((row, index) => ({
                rank: index + 1,
                ...row
              }))}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">State + Channel CLV Matrix</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            This matrix compares average CLV across states and acquisition channels to reveal where channel strategy should be localized.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300">State</th>
                  {channels.map((channel) => (
                    <th key={channel} className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                      {channel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {states.map((state) => (
                  <tr key={state}>
                    <td className="p-2 font-semibold text-slate-800 dark:text-slate-100">{state}</td>
                    {channels.map((channel) => {
                      const value = getMatrixValue(state, channel);
                      return (
                        <td key={`${state}-${channel}`} className="p-1">
                          <div className={`rounded-md px-2 py-1 text-center font-semibold ${getCellTone(value)}`}>
                            {formatCurrency(value)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <RecommendationCard item={data.channelInsights.bestSource} />
    </section>
  );
};

export default ChannelPerformance;
