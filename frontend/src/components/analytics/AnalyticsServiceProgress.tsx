import React from 'react';

interface ServiceDistributionItem {
  serviceName: string;
  percentage: number;
  color: string;
}

interface AnalyticsServiceProgressProps {
  data: ServiceDistributionItem[];
}

export const AnalyticsServiceProgress: React.FC<AnalyticsServiceProgressProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-content-muted font-mono text-sm py-10">
        No service distribution data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item, idx) => (
        <div key={idx}>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-content-primary">{item.serviceName}</span>
            <span className="text-content-secondary font-mono font-bold">{Math.round(item.percentage)}%</span>
          </div>
          <div className="h-2 w-full bg-surface-interactive rounded-full overflow-hidden border border-border-subtle">
            <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
          </div>
        </div>
      ))}
    </div>
  );
};
