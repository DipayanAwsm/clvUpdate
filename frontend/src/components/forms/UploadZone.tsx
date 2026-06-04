import { UploadCloud } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (file: File | null) => void;
  fileName?: string;
}

const UploadZone = ({ onFileSelected, fileName }: UploadZoneProps) => {
  return (
    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-300">
      <UploadCloud className="mx-auto h-8 w-8 text-slate-500" />
      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Drag and drop CSV here or click to upload</p>
      <p className="mt-1 text-xs text-slate-500">Batch scoring preview is simulated in demo mode.</p>
      {fileName ? <p className="mt-3 text-xs font-semibold text-brand-600">Selected: {fileName}</p> : null}
      <input className="hidden" type="file" accept=".csv" onChange={(event) => onFileSelected(event.target.files?.[0] || null)} />
    </label>
  );
};

export default UploadZone;
