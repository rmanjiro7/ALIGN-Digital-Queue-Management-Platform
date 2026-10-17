import React from 'react';
import { Calendar } from 'lucide-react';

export type DateRangePreset = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS';

interface DateRangeFilterProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-3.5 h-3.5 text-content-secondary" />
      <span className="text-[11px] uppercase tracking-wide font-semibold text-content-secondary">Range:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateRangePreset)}
        className="bg-surface-interactive border border-border-strong text-xs font-mono rounded px-2.5 py-1 text-content-primary focus:outline-none focus:border-accent"
      >
        <option value="TODAY">Today</option>
        <option value="YESTERDAY">Yesterday</option>
        <option value="LAST_7_DAYS">Last 7 Days</option>
        <option value="LAST_30_DAYS">Last 30 Days</option>
      </select>
    </div>
  );
};
