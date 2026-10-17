import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ChartDataPoint {
  time: string;
  issued: number;
  served: number;
}

interface AnalyticsBarChartProps {
  data: ChartDataPoint[];
}

export const AnalyticsBarChart: React.FC<AnalyticsBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-content-muted font-mono text-sm">
        No traffic data available for this period.
      </div>
    );
  }

  return (
    <div className="h-64 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: 'var(--color-content-muted)', fontFamily: 'monospace' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: 'var(--color-content-muted)', fontFamily: 'monospace' }} 
          />
          <Tooltip 
            cursor={{ fill: 'var(--color-surface-interactive)' }}
            contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-surface-elevated)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
            labelStyle={{ fontWeight: 'bold', color: 'var(--color-content-primary)', marginBottom: '4px' }}
            itemStyle={{ color: 'var(--color-content-secondary)' }}
          />
          <Legend 
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: 'var(--color-content-primary)', fontWeight: 'bold', fontFamily: 'monospace', paddingTop: '10px' }}
          />
          <Bar dataKey="issued" name="Tokens Issued" fill="var(--color-border-strong)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="served" name="Tokens Served" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
