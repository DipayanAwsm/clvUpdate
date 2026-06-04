import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import KPIStatCard from '../../components/cards/KPIStatCard';
import InsightCard from '../../components/cards/InsightCard';
import RecommendationCard from '../../components/cards/RecommendationCard';
import ChartCard from '../../components/charts/ChartCard';
import SectionHeader from '../../components/common/SectionHeader';
import type { DashboardDataBundle } from '../../types';

interface DashboardHomeProps {
  data: DashboardDataBundle;
}

const segmentColors = ['#2563eb', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444'];

const DashboardHome = ({ data }: DashboardHomeProps) => {
  const avgClvTrend = data.executive.clvTrend.map((row) => ({
    ...row,
    avgClv: Number((row as Record<string, number>).avgClv ?? (row as Record<string, number>).clv ?? 0)
  }));

  const totalSegmentCustomers = data.executive.segmentDistribution.reduce(
    (acc, row) => acc + Number(row.customers || 0),
    0
  );

  const findSegmentCount = (segmentName: string) =>
    data.executive.segmentDistribution
      .filter((row) => String(row.name) === segmentName)
      .reduce((acc, row) => acc + Number(row.customers || 0), 0);

  const highValueCount =
    findSegmentCount('High Value, Low Risk') + findSegmentCount('High Value, High Risk');
  const growthCount = findSegmentCount('Growth Potential');
  const lowValueCount = findSegmentCount('Low Value');
  const lossMakingCount = findSegmentCount('Loss Making');

  const executiveSegmentBuckets = [
    {
      bucket: 'High Value',
      rule: 'High Value, Low Risk + High Value, High Risk',
      customers: highValueCount
    },
    { bucket: 'Growth', rule: 'Growth Potential', customers: growthCount },
    { bucket: 'Low Value', rule: 'Low Value', customers: lowValueCount },
    { bucket: 'Loss-Making', rule: 'Loss Making', customers: lossMakingCount }
  ];

  const toShare = (count: number) =>
    `${((count / Math.max(totalSegmentCustomers, 1)) * 100).toFixed(1)}%`;

  return (
    <section className="space-y-5">
      <SectionHeader
        title="CLTV Outcome Summary"
        subtitle="Portfolio Health Snapshot"
        question="Where are value and growth concentrated in the current insurance portfolio?"
        takeaway="Use this page to align budget allocation, retention prioritization, and strategic growth focus."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.executive.kpis.map((item, index) => (
          <KPIStatCard key={item.label} item={item} index={index} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Average CLV Trend Over Time"
          subtitle="How expected value is moving"
          helperText="This chart tracks average CLV by year under current filters."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={avgClvTrend}>
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="avgClv" stroke="#2563eb" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="State-wise average CLV Snapshot"
          subtitle="Which states contribute strongest value"
          helperText="Average CLV by state highlights regional value quality and budget focus opportunities."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.executive.stateClvSnapshot}>
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgClv" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <ChartCard
            title="Segment Distribution"
            subtitle="How customers are currently segmented"
            helperText="Shows distribution across High Value, Growth, and Loss-Making cohorts for prioritization."
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.executive.segmentDistribution} dataKey="customers" nameKey="name" innerRadius={65} outerRadius={105}>
                  {data.executive.segmentDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={segmentColors[index % segmentColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    `${Number(value).toLocaleString()} (${toShare(Number(value))})`,
                    'Customers'
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              How Segment Distribution Is Calculated
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Segment share (%) = segment customer count / total customers in current filters × 100.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-2 py-1 text-left">Bucket</th>
                    <th className="px-2 py-1 text-left">Calculation Rule</th>
                    <th className="px-2 py-1 text-right">Customers</th>
                    <th className="px-2 py-1 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {executiveSegmentBuckets.map((row) => (
                    <tr key={row.bucket} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-2 py-1 font-semibold">{row.bucket}</td>
                      <td className="px-2 py-1">{row.rule}</td>
                      <td className="px-2 py-1 text-right">{row.customers.toLocaleString()}</td>
                      <td className="px-2 py-1 text-right">{toShare(row.customers)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-300 font-semibold dark:border-slate-600">
                    <td className="px-2 py-1" colSpan={2}>
                      Total
                    </td>
                    <td className="px-2 py-1 text-right">{totalSegmentCustomers.toLocaleString()}</td>
                    <td className="px-2 py-1 text-right">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <InsightCard title="Key Business Takeaways" points={data.executive.takeaways} />

        <article className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Top Recommendations Summary</h3>
          {data.executive.topRecommendations.map((item) => (
            <RecommendationCard key={item.title} item={item} />
          ))}
        </article>
      </div>
    </section>
  );
};

export default DashboardHome;
