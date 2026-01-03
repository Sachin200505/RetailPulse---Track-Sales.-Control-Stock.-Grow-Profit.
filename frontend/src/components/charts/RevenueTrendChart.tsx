import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService, RevenueDataPoint } from '@/services/dashboardService';

interface RevenueTrendChartProps {
  data?: RevenueDataPoint[];
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data: initialData }) => {
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [chartData, setChartData] = useState<RevenueDataPoint[]>(initialData || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getRevenueTrend(view);
      setChartData(data);
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (view === 'monthly') {
      const d = new Date(date + '-01');
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const displayData = chartData.map(d => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="chart-title mb-0">Revenue Trend</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView('daily')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === 'daily' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === 'monthly' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>
      <div className="h-72 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="dateLabel" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
            />
            <YAxis 
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
