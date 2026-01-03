import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TopProduct } from '@/services/dashboardService';

interface TopProductsChartProps {
  data: TopProduct[];
}

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

  // Prepare chart data with proper numeric indices for X-axis
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => b.revenue - a.revenue)
      .map((item, index) => ({
        ...item,
        index: index + 1, // Numeric index starting from 1
        displayName: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
      }));
  }, [data]);

  // Chart colors
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(152 45% 45%)',
    'hsl(280 70% 60%)',
    'hsl(200 80% 50%)',
  ];

  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Top Selling Products</h3>
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          No sales data available
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Top Selling Products</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number" 
              tickFormatter={(value: number) => {
                if (value >= 1000) {
                  return `₹${(value / 1000).toFixed(0)}k`;
                }
                return `₹${value}`;
              }}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 'dataMax']}
              allowDecimals={false}
              tickCount={5}
            />
            <YAxis 
              dataKey="displayName" 
              type="category" 
              width={100}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.displayName === label);
                return item?.name || label;
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar 
              dataKey="revenue" 
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
