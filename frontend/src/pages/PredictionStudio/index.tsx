import { type FormEvent, useMemo, useState } from 'react';
import { Download, FileCheck2 } from 'lucide-react';

import PredictionResultCard from '../../components/cards/PredictionResultCard';
import ChartCard from '../../components/charts/ChartCard';
import UploadZone from '../../components/forms/UploadZone';
import SectionHeader from '../../components/common/SectionHeader';
import EmptyState from '../../components/common/EmptyState';
import { usePrediction } from '../../hooks/usePrediction';
import type { DashboardDataBundle, PredictionInput, PredictionOutput } from '../../types';
import { formatCurrency } from '../../utils/format';

interface PredictionStudioProps {
  data: DashboardDataBundle;
}

type Tab = 'single' | 'batch';

interface BatchScoredRow extends PredictionInput, PredictionOutput {
  id: string;
}

const toNumber = (value: string | undefined, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const PredictionStudio = ({ data }: PredictionStudioProps) => {
  const { predictSingle, predictBatch } = usePrediction();
  const [tab, setTab] = useState<Tab>('single');

  const marketingChannels = useMemo(
    () => Array.from(new Set(data.records.map((row) => row.marketingChannel))),
    [data.records]
  );

  const defaultInput: PredictionInput = {
    state: data.records[0]?.state || 'CA',
    year: data.records[0]?.year || 2025,
    earnedPremium: 1650,
    netLossPaid: 860,
    customerTenure: 56,
    creditScore: 705,
    paymentDelayDays: 5,
    customerSatisfaction: 4.1,
    claimCount: 1,
    deductible: 1000,
    coverageAmount: 340000,
    marketingChannel: marketingChannels[0] || 'Agent Referral',
    agentExperienceYears: 9,
    discountRate: 0.07
  };

  const [singleInput, setSingleInput] = useState<PredictionInput>(defaultInput);
  const [singleResult, setSingleResult] = useState<PredictionOutput | null>(null);

  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [batchRows, setBatchRows] = useState<PredictionInput[]>([]);
  const [batchResults, setBatchResults] = useState<BatchScoredRow[]>([]);
  const [batchStatus, setBatchStatus] = useState<string>('Upload a CSV to generate batch CLV predictions.');

  const handleSingleChange = <K extends keyof PredictionInput>(key: K, value: PredictionInput[K]) => {
    setSingleInput((prev) => ({ ...prev, [key]: value }));
  };

  const handleSingleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      const result = await predictSingle(singleInput);
      setSingleResult(result);
    })();
  };

  const parseCsvToInputs = (csvText: string): PredictionInput[] => {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
    const indexOf = (...keys: string[]) => headers.findIndex((header) => keys.includes(header));

    const getValue = (values: string[], ...keys: string[]) => {
      const idx = indexOf(...keys);
      return idx >= 0 ? values[idx] : undefined;
    };

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((item) => item.trim());
      return {
        state: getValue(values, 'state', 'policyratedstate_tp') || defaultInput.state,
        year: toNumber(getValue(values, 'year', 'policyyear'), defaultInput.year),
        earnedPremium: toNumber(getValue(values, 'earnedpremium', 'earned_premium'), defaultInput.earnedPremium),
        netLossPaid: toNumber(getValue(values, 'netlosspaid', 'net_loss_paid'), defaultInput.netLossPaid),
        customerTenure: toNumber(getValue(values, 'customertenure', 'customer_tenure'), defaultInput.customerTenure),
        creditScore: toNumber(getValue(values, 'creditscore', 'credit_score'), defaultInput.creditScore),
        paymentDelayDays: toNumber(getValue(values, 'paymentdelaydays', 'payment_delay_days'), defaultInput.paymentDelayDays),
        customerSatisfaction: toNumber(
          getValue(values, 'customersatisfaction', 'customer_satisfaction'),
          defaultInput.customerSatisfaction
        ),
        claimCount: toNumber(getValue(values, 'claimcount', 'claim_count'), defaultInput.claimCount),
        deductible: toNumber(getValue(values, 'deductible'), defaultInput.deductible),
        coverageAmount: toNumber(getValue(values, 'coverageamount', 'coverage_amount'), defaultInput.coverageAmount),
        marketingChannel: getValue(values, 'marketingchannel', 'marketing_channel') || defaultInput.marketingChannel,
        agentExperienceYears: toNumber(
          getValue(values, 'agentexperienceyears', 'agent_experience_years'),
          defaultInput.agentExperienceYears
        ),
        discountRate: toNumber(getValue(values, 'discountrate', 'discount_rate'), defaultInput.discountRate)
      };
    });
  };

  const readFileText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read uploaded file.'));
      reader.readAsText(file);
    });
  };

  const handleFileSelected = async (file: File | null) => {
    if (!file) {
      setSelectedFileName('');
      setBatchRows([]);
      setBatchResults([]);
      setBatchStatus('Upload a CSV to generate batch CLV predictions.');
      return;
    }

    setSelectedFileName(file.name);

    try {
      const text = await readFileText(file);
      const parsedRows = parseCsvToInputs(text);

      if (!parsedRows.length) {
        setBatchRows([]);
        setBatchResults([]);
        setBatchStatus('No valid rows detected. Ensure the CSV has headers and at least one customer row.');
        return;
      }

      const predictions = await predictBatch(parsedRows);
      const scored = parsedRows.map((row, idx) => ({ ...row, ...predictions[idx], id: `row-${idx + 1}` }));
      setBatchRows(parsedRows);
      setBatchResults(scored);
      setBatchStatus(`Processed ${parsedRows.length.toLocaleString()} rows and generated CLV predictions.`);
    } catch (error) {
      setBatchRows([]);
      setBatchResults([]);
      setBatchStatus(error instanceof Error ? error.message : 'Unable to process uploaded CSV.');
    }
  };

  const downloadResults = () => {
    if (!batchResults.length) return;

    const headers = [
      'state',
      'year',
      'earnedPremium',
      'netLossPaid',
      'customerTenure',
      'creditScore',
      'paymentDelayDays',
      'customerSatisfaction',
      'claimCount',
      'deductible',
      'coverageAmount',
      'marketingChannel',
      'agentExperienceYears',
      'discountRate',
      'predictedClv',
      'highValueFlag',
      'segment',
      'recommendedAction'
    ];

    const lines = batchResults.map((row) =>
      headers
        .map((header) => {
          const value = (row as Record<string, string | number>)[header];
          const escaped = String(value ?? '').replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(',')
    );

    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'clv_batch_predictions.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Prediction Studio"
        subtitle="Scoring Workspace"
        question="Given customer attributes, what CLV and segment should we expect and what action should we take?"
        takeaway="This studio converts model output into customer-level action recommendations for retention, upsell, and servicing strategy."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('single')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'single'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            Single Customer Prediction
          </button>
          <button
            type="button"
            onClick={() => setTab('batch')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'batch'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            Batch Upload
          </button>
        </div>
      </div>

      {tab === 'single' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Customer Input Form</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Enter customer and policy attributes to generate predicted CLV and strategic recommendations.
            </p>

            <form onSubmit={handleSingleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                State
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  value={singleInput.state}
                  onChange={(event) => handleSingleChange('state', event.target.value)}
                >
                  {Array.from(new Set(data.records.map((row) => row.state))).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Year
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.year}
                  onChange={(event) => handleSingleChange('year', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Earned Premium
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.earnedPremium}
                  onChange={(event) => handleSingleChange('earnedPremium', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Net Loss Paid
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.netLossPaid}
                  onChange={(event) => handleSingleChange('netLossPaid', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Customer Tenure (months)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.customerTenure}
                  onChange={(event) => handleSingleChange('customerTenure', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Credit Score
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.creditScore}
                  onChange={(event) => handleSingleChange('creditScore', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Payment Delay Days
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.paymentDelayDays}
                  onChange={(event) => handleSingleChange('paymentDelayDays', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Customer Satisfaction
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={singleInput.customerSatisfaction}
                  onChange={(event) => handleSingleChange('customerSatisfaction', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Claim Count
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.claimCount}
                  onChange={(event) => handleSingleChange('claimCount', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Deductible
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.deductible}
                  onChange={(event) => handleSingleChange('deductible', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Coverage Amount
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.coverageAmount}
                  onChange={(event) => handleSingleChange('coverageAmount', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Marketing Channel
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  value={singleInput.marketingChannel}
                  onChange={(event) => handleSingleChange('marketingChannel', event.target.value)}
                >
                  {marketingChannels.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Agent Experience Years
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  value={singleInput.agentExperienceYears}
                  onChange={(event) => handleSingleChange('agentExperienceYears', Number(event.target.value))}
                />
              </label>

              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Discount Rate
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  type="number"
                  step="0.01"
                  value={singleInput.discountRate}
                  onChange={(event) => handleSingleChange('discountRate', Number(event.target.value))}
                />
              </label>

              <button
                type="submit"
                className="sm:col-span-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Predict CLV and Segment
              </button>
            </form>
          </article>

          <PredictionResultCard result={singleResult} />
        </div>
      ) : (
        <div className="space-y-4">
          <ChartCard
            title="Batch Upload"
            subtitle="CSV prediction workflow"
            helperText="Upload a customer CSV, preview scored outputs, and export results for campaign and servicing teams."
          >
            <div className="space-y-4">
              <UploadZone onFileSelected={handleFileSelected} fileName={selectedFileName} />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {batchStatus}
              </div>

              {batchRows.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Rows Scored</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{batchRows.length.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Average Predicted CLV</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(
                        batchResults.reduce((acc, row) => acc + Number(row.predictedClv), 0) / Math.max(batchResults.length, 1)
                      )}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadResults}
                  disabled={!batchResults.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Download Results CSV
                </button>
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <FileCheck2 className="h-4 w-4" /> Production API integration can replace this mock scoring call.
                </div>
              </div>
            </div>
          </ChartCard>

          {batchResults.length ? (
            <article className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Batch Prediction Preview</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                First 10 rows with predicted CLV, segment, and recommended action.
              </p>

              <table className="mt-3 w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left">State</th>
                    <th className="px-3 py-2 text-left">Year</th>
                    <th className="px-3 py-2 text-left">Predicted CLV</th>
                    <th className="px-3 py-2 text-left">Segment</th>
                    <th className="px-3 py-2 text-left">Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.slice(0, 10).map((row) => (
                    <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-3 py-2">{row.state}</td>
                      <td className="px-3 py-2">{row.year}</td>
                      <td className="px-3 py-2">{formatCurrency(row.predictedClv)}</td>
                      <td className="px-3 py-2">{row.segment}</td>
                      <td className="px-3 py-2">{row.recommendedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ) : (
            <EmptyState
              title="No Batch Predictions Yet"
              message="Upload a CSV with customer attributes to preview scored outputs and export prediction files."
            />
          )}
        </div>
      )}
    </section>
  );
};

export default PredictionStudio;
