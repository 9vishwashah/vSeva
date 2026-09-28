import React from 'react';
import { Plus, X } from 'lucide-react';

export interface RepeaterColumn {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'tel' | 'number';
  span?: 1 | 2; // grid column span within a row
}

interface RepeaterFieldProps {
  columns: RepeaterColumn[];
  rows: Record<string, string>[];
  onChange: (rows: Record<string, string>[]) => void;
  addLabel: string;
  emptyRow?: Record<string, string>;
}

// One repeatable-row input used for trustees / member contacts / routes —
// same shape (a few small text inputs + Add another), just different column
// sets, rather than three near-identical bespoke components.
const RepeaterField: React.FC<RepeaterFieldProps> = ({ columns, rows, onChange, addLabel, emptyRow }) => {
  const blank = emptyRow || Object.fromEntries(columns.map((c) => [c.key, '']));

  const updateRow = (index: number, key: string, value: string) => {
    const next = rows.map((r, i) => (i === index ? { ...r, [key]: value } : r));
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...rows, { ...blank }]);
  };

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2">
            {columns.map((col) => (
              <input
                key={col.key}
                type={col.type || 'text'}
                value={row[col.key] || ''}
                onChange={(e) => updateRow(i, col.key, e.target.value)}
                placeholder={col.placeholder || col.label}
                className={`${col.span === 2 ? 'col-span-2' : ''} w-full py-2.5 px-3 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 text-sm text-[#241C17] transition-shadow`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="mt-1 shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Remove"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm font-semibold text-saffron-700 hover:text-saffron-800 px-1"
      >
        <Plus size={15} /> {addLabel}
      </button>
    </div>
  );
};

export default RepeaterField;
