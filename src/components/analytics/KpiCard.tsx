import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  borderColor: string;
  subtitle?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  iconColor, 
  borderColor, 
  subtitle 
}) => {
  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span className="font-mono uppercase text-[10px] font-bold">{title}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="text-2xl md:text-3xl font-black text-[#0F172A]">
        {value}
      </div>
      {subtitle && (
        <div className="mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};
