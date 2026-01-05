import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RevenueDataPoint } from '@/services/dashboardService';

interface ProfitRevenueChartProps {
  data: RevenueDataPoint[];
}

export const ProfitRevenueChart: React.FC<ProfitRevenueChartProps> = ({ data }) => {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = data.map(d => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

  return (
    <div className="chart-container">
      <h3 className="chart-title">Profit vs Revenue</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(150 15% 88%)" />
            <XAxis 
              dataKey="dateLabel" 
              stroke="hsl(220 10% 45%)"
              fontSize={11}
            />
            <YAxis 
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              stroke="hsl(220 10% 45%)"
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: number, _name: string, props) => [
                formatCurrency(value),
                props && 'dataKey' in props && props.dataKey === 'revenue' ? 'Revenue' : 'Profit'
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend formatter={(value) => value === 'revenue' ? 'Revenue' : 'Profit'} />
            <Bar 
              dataKey="revenue" 
              fill="hsl(152 45% 45%)" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="profit" 
              fill="hsl(200 80% 50%)" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
