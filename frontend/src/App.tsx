import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Gauge,
  Layers3,
  Sparkles,
  Users
} from 'lucide-react';

import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import FilterBar from './components/filters/FilterBar';
import { STATES, YEARS } from './data/mockData';
import { useLiveDashboardData } from './hooks/useLiveDashboardData';
import type { FilterState, NavItem } from './types';

import DashboardHome from './pages/DashboardHome';
import EDAOverview from './pages/EDAOverview';
import ChannelPerformance from './pages/ChannelPerformance';
import Segmentation from './pages/Segmentation';
import ModelInsights from './pages/ModelInsights';
import PredictionStudio from './pages/PredictionStudio';

const navItems: NavItem[] = [
  { id: 'eda', label: 'EDA Overview', icon: Layers3 },
  { id: 'model', label: 'Model Insights', icon: BarChart3 },
  { id: 'executive', label: 'CLTV Outcome Summary', icon: Gauge },
  { id: 'channel', label: 'Channel Insights', icon: Activity },
  { id: 'segmentation', label: 'Segmentation', icon: Users },
  { id: 'prediction', label: 'Prediction Studio', icon: Sparkles }
];

const themeStorageKey = 'clv-intelligence-theme';

const App = () => {
  const [activePage, setActivePage] = useState<string>('executive');
  const [filters, setFilters] = useState<FilterState>({ states: STATES, years: YEARS });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem(themeStorageKey);
    return saved === 'dark';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem(themeStorageKey, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const normalizedFilters = useMemo(
    () => ({
      states: filters.states.length ? filters.states : STATES,
      years: filters.years.length ? filters.years : YEARS
    }),
    [filters.states, filters.years]
  );

  const { data, source, loading, error } = useLiveDashboardData(normalizedFilters);

  const filterSummary = useMemo(() => {
    const stateLabel =
      normalizedFilters.states.length === STATES.length
        ? 'All States'
        : `${normalizedFilters.states.length} State${normalizedFilters.states.length > 1 ? 's' : ''}`;

    const yearLabel =
      normalizedFilters.years.length === YEARS.length
        ? 'All Years'
        : `${normalizedFilters.years.length} Year${normalizedFilters.years.length > 1 ? 's' : ''}`;

    return `${stateLabel} · ${yearLabel}`;
  }, [normalizedFilters.states, normalizedFilters.years]);

  const renderPage = () => {
    switch (activePage) {
      case 'eda':
        return <EDAOverview data={data} />;
      case 'channel':
        return <ChannelPerformance data={data} />;
      case 'segmentation':
        return <Segmentation data={data} />;
      case 'model':
        return <ModelInsights data={data} />;
      case 'prediction':
        return <PredictionStudio data={data} />;
      default:
        return <DashboardHome data={data} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar items={navItems} active={activePage} onChange={setActivePage} />

      <div className="lg:pl-72">
        <Topbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode((prev) => !prev)} filterSummary={filterSummary} />

        <FilterBar
          states={STATES}
          years={YEARS}
          selectedStates={filters.states}
          selectedYears={filters.years}
          onStatesChange={(states) => setFilters((prev) => ({ ...prev, states }))}
          onYearsChange={(years) => setFilters((prev) => ({ ...prev, years }))}
          onReset={() => setFilters({ states: STATES, years: YEARS })}
        />

        <main className="px-4 pb-8 pt-5 sm:px-6">
          <article className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft lg:hidden dark:border-slate-800 dark:bg-slate-900">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navigate Sections</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={activePage}
              onChange={(event) => setActivePage(event.target.value)}
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </article>

          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>

          <footer className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Data source: <span className="font-semibold uppercase">{source}</span>
            {loading ? ' · Syncing backend artifacts...' : ''}
            {error ? ` · ${error}` : ''}
            <br />
            Demo note: This frontend is designed for manager and client walkthroughs. Replace mock hooks in
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">src/hooks</code>
            with backend APIs for production deployment.
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;
