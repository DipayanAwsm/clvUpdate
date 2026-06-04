import type { RecommendationItem } from '../../types';

interface RecommendationCardProps {
  item: RecommendationItem;
}

const toneMap = {
  Critical: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  High: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  Medium: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
} as const;

const RecommendationCard = ({ item }: RecommendationCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${toneMap[item.priority]}`}>{item.priority}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.detail}</p>
    </article>
  );
};

export default RecommendationCard;
