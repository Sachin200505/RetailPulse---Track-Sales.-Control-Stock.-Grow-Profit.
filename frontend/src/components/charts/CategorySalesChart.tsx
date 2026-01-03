import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CategorySales } from '@/services/dashboardService';

interface CategorySalesChartProps {
  data: CategorySales[];
}

const COLORS = [
  'hsl(152 45% 45%)',  // Primary green
  'hsl(200 80% 50%)',  // Blue
  'hsl(38 92% 50%)',   // Orange
  'hsl(280 60% 50%)',  // Purple
  'hsl(350 70% 55%)',  // Red
];

export const CategorySalesChart: React.FC<CategorySalesChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

  return (
    <div className="chart-container">
      <h3 className="chart-title">Category-wise Sales</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="sales"
              nameKey="category"
              label={({ category, percentage }) => `${category} (${percentage}%)`}
              labelLine={{ stroke: 'hsl(220 10% 65%)', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Sales']}
              contentStyle={{
                backgroundColor: 'hsl(0 0% 100%)',
                border: '1px solid hsl(150 15% 88%)',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
