import type { ReactNode } from 'react';

interface DataTableColumn<T extends Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => string | number | ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  rows: T[];
}

const DataTable = <T extends Record<string, unknown>>({ columns, rows }: DataTableProps<T>) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {columns.map((column) => (
                <td key={`${idx}-${String(column.key)}`} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
