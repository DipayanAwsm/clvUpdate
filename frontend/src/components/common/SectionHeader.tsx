import { motion } from 'framer-motion';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  question?: string;
  takeaway?: string;
}

const SectionHeader = ({ title, subtitle, question, takeaway }: SectionHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-100">{subtitle}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      {question ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Business question:</span> {question}
        </p>
      ) : null}
      {takeaway ? (
        <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-slate-800 dark:text-brand-100">
          <span className="font-semibold">Business takeaway:</span> {takeaway}
        </p>
      ) : null}
    </motion.div>
  );
};

export default SectionHeader;
