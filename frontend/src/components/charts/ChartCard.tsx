import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle: string;
  helperText: string;
  children: ReactNode;
}

const ChartCard = ({ title, subtitle, helperText, children }: ChartCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{subtitle}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{helperText}</p>
      <div className="mt-3 h-[300px]">{children}</div>
    </article>
  );
};

export default ChartCard;
