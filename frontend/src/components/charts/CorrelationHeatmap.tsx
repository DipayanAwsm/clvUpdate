import { cn } from '../../utils/cn';

interface CorrelationHeatmapProps {
  data: Array<{ x: string; y: string; value: number }>;
}

const CorrelationHeatmap = ({ data }: CorrelationHeatmapProps) => {
  const axes = Array.from(new Set(data.map((item) => item.x)));

  const cellTone = (value: number) => {
    if (value >= 0.65) return 'bg-emerald-500/90 text-white';
    if (value >= 0.35) return 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100';
    if (value <= -0.65) return 'bg-rose-500/90 text-white';
    if (value <= -0.35) return 'bg-rose-200 text-rose-900 dark:bg-rose-900/50 dark:text-rose-100';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left">Feature</th>
            {axes.map((axis) => (
              <th key={axis} className="p-2 text-center font-medium">
                {axis}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {axes.map((rowAxis) => (
            <tr key={rowAxis}>
              <td className="p-2 font-semibold">{rowAxis}</td>
              {axes.map((colAxis) => {
                const cell = data.find((item) => item.x === rowAxis && item.y === colAxis);
                const value = Number(cell?.value || 0);
                return (
                  <td key={`${rowAxis}-${colAxis}`} className="p-1">
                    <div className={cn('rounded-md px-2 py-1 text-center font-semibold', cellTone(value))}>{value.toFixed(2)}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CorrelationHeatmap;
