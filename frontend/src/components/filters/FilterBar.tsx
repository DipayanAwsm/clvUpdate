import { Filter, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  states: string[];
  years: number[];
  selectedStates: string[];
  selectedYears: number[];
  onStatesChange: (states: string[]) => void;
  onYearsChange: (years: number[]) => void;
  onReset: () => void;
}

const FilterBar = ({
  states,
  years,
  selectedStates,
  selectedYears,
  onStatesChange,
  onYearsChange,
  onReset
}: FilterBarProps) => {
  const toggleState = (state: string) => {
    if (selectedStates.includes(state)) {
      onStatesChange(selectedStates.filter((item) => item !== state));
      return;
    }
    onStatesChange([...selectedStates, state]);
  };

  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      onYearsChange(selectedYears.filter((item) => item !== year));
      return;
    }
    onYearsChange([...selectedYears, year]);
  };

  return (
    <section className="sticky top-[72px] z-20 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Filter className="h-4 w-4" /> Global Filters
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Use these filters to analyze customer value and profitability across regions and time periods.
            </p>
          </div>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" /> Reset Filters
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <details open className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">States</summary>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {states.map((state) => (
                <label key={state} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={selectedStates.includes(state)} onChange={() => toggleState(state)} />
                  {state}
                </label>
              ))}
            </div>
          </details>

          <details open className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">Years</summary>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {years.map((year) => (
                <label key={year} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={selectedYears.includes(year)} onChange={() => toggleYear(year)} />
                  {year}
                </label>
              ))}
            </div>
          </details>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {selectedStates.map((state) => (
            <span key={`state-${state}`} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-200">
              State: {state}
            </span>
          ))}
          {selectedYears.map((year) => (
            <span key={`year-${year}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Year: {year}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
