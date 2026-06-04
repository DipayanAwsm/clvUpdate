import { motion } from 'framer-motion';

import { cn } from '../../utils/cn';
import type { NavItem } from '../../types';

interface SidebarProps {
  items: NavItem[];
  active: string;
  onChange: (id: string) => void;
}

const Sidebar = ({ items, active, onChange }: SidebarProps) => {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white/95 px-4 py-6 backdrop-blur lg:block dark:border-slate-800 dark:bg-slate-950/95">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">CLV Command</p>
        <h1 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Customer Value Intelligence</h1>
        <p className="mt-1 text-xs text-slate-500">Enterprise analytics workspace for insurance portfolio decisions.</p>
      </div>

      <nav className="mt-5 space-y-1">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/40 dark:text-brand-100'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
