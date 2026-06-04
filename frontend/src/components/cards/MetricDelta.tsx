import { TrendingDown, TrendingUp } from 'lucide-react';

import { formatPercent } from '../../utils/format';

interface MetricDeltaProps {
  value: number;
}

const MetricDelta = ({ value }: MetricDeltaProps) => {
  const positive = value >= 0;
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
        positive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
      }`}
    >
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {formatPercent(Math.abs(value), 1)}
    </div>
  );
};

export default MetricDelta;
