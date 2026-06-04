import { Command, MoonStar, Search, Sun, UserCircle2 } from 'lucide-react';

interface TopbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  filterSummary: string;
}

const Topbar = ({ darkMode, onToggleDarkMode, filterSummary }: TopbarProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">CLV Analytics Product</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Insurance Portfolio Intelligence Studio</h1>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden min-w-[280px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 lg:flex dark:border-slate-700 dark:bg-slate-900">
            <Search className="h-4 w-4" />
            <span>Quick command or search metrics...</span>
            <kbd className="ml-auto rounded border border-slate-300 px-1.5 py-0.5 text-[10px] dark:border-slate-600">⌘K</kbd>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 md:flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Command className="h-3.5 w-3.5" />
            {filterSummary}
          </div>

          <button
            onClick={onToggleDarkMode}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </button>

          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <UserCircle2 className="h-4 w-4" /> Analyst User
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
