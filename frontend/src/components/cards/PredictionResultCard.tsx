import type { PredictionOutput } from '../../types';
import { formatCurrency } from '../../utils/format';

interface PredictionResultCardProps {
  result: PredictionOutput | null;
}

const PredictionResultCard = ({ result }: PredictionResultCardProps) => {
  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Submit customer inputs to generate CLV prediction, segment, and action guidance.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Prediction Result</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-xs uppercase tracking-wide text-slate-500">Predicted CLV</p>
          <p className="text-xl font-bold">{formatCurrency(result.predictedClv)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-xs uppercase tracking-wide text-slate-500">Segment</p>
          <p className="text-sm font-semibold">{result.segment}</p>
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-slate-800 dark:text-brand-100">
        <span className="font-semibold">Recommended action:</span> {result.recommendedAction}
      </p>
    </div>
  );
};

export default PredictionResultCard;
