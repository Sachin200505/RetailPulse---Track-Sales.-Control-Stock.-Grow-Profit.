import React, { useEffect, useState, useMemo } from 'react';
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { showLabels, radii } = useMemo(() => {
    const mobile = isMobile;
    return {
      showLabels: !mobile && data.length <= 4,
      radii: mobile ? { inner: 48, outer: 72 } : { inner: 60, outer: 88 },
    };
  }, [isMobile, data.length]);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Category-wise Sales</h3>
      <div className="h-80 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={radii.inner}
              outerRadius={radii.outer}
              paddingAngle={2}
              dataKey="sales"
              nameKey="category"
              label={showLabels ? ({ category, percentage }) => `${category} (${percentage}%)` : false}
              labelLine={showLabels ? { stroke: 'hsl(220 10% 65%)', strokeWidth: 1 } : false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, _name: string, props) => [
                formatCurrency(value),
                props && 'payload' in props ? props.payload.category : 'Sales'
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend verticalAlign="bottom" height={44} wrapperStyle={{ paddingTop: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
