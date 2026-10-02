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
      <Calendar className="w-4 h-4 text-slate-500" />
      <span className="text-xs font-bold text-slate-500">Date Range:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateRangePreset)}
        className="bg-[#F1F5F9] border border-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
      >
        <option value="TODAY">Today</option>
        <option value="YESTERDAY">Yesterday</option>
        <option value="LAST_7_DAYS">Last 7 Days</option>
        <option value="LAST_30_DAYS">Last 30 Days</option>
      </select>
    </div>
  );
};
