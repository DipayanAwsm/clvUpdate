interface InsightCardProps {
  title: string;
  points: string[];
}

const InsightCard = ({ title, points }: InsightCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </article>
  );
};

export default InsightCard;
