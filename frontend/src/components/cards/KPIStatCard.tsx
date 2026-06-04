import { motion } from 'framer-motion';
import { DollarSign, Users } from 'lucide-react';

import MetricDelta from './MetricDelta';
import { formatCompactCurrency, formatNumber, formatPercent } from '../../utils/format';
import type { KPIItem } from '../../types';

interface KPIStatCardProps {
  item: KPIItem;
  index: number;
}

const KPIStatCard = ({ item, index }: KPIStatCardProps) => {
  const formatValue = () => {
    if (item.format === 'currency') return formatCompactCurrency(item.value);
    if (item.format === 'percent') return formatPercent(item.value);
    return formatNumber(item.value);
  };

  const Icon = item.format === 'currency' ? DollarSign : Users;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.label}</p>
        <span className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-slate-800 dark:text-brand-200">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{formatValue()}</p>
      <div className="mt-2 flex items-center justify-between">
        <MetricDelta value={item.delta} />
        <span className="text-xs text-slate-500 dark:text-slate-400">vs prior year</span>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{item.explanation}</p>
      {item.calculation ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          {item.calculation}
        </div>
      ) : null}
    </motion.article>
  );
};

export default KPIStatCard;
