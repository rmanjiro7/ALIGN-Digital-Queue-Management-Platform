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
    <div className={`bg-surface-elevated p-5 rounded-lg border border-border-subtle flex flex-col justify-between h-full`}>
      <div className="flex items-center justify-between text-xs text-content-secondary mb-3">
        <span className="font-mono uppercase text-[10px] tracking-wider font-semibold">{title}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="text-2xl md:text-3xl font-light tracking-tight text-content-primary">
        {value}
      </div>
      {subtitle && (
        <div className="mt-2 text-[10px] text-content-muted">
          {subtitle}
        </div>
      )}
    </div>
  );
};
