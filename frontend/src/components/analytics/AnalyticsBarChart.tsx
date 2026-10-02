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
      <div className="h-64 w-full flex items-center justify-center text-slate-400 font-mono text-sm">
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} 
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
          />
          <Legend 
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', paddingTop: '10px' }}
          />
          <Bar dataKey="issued" name="Tokens Issued" fill="#0F172A" radius={[4, 4, 0, 0]} />
          <Bar dataKey="served" name="Tokens Served" fill="#00ACC1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
