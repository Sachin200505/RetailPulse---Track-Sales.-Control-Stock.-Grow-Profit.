import React, { useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ExpenseByCategory } from '@/services/dashboardService';

interface ExpenseBreakdownChartProps {
  data: ExpenseByCategory[];
}

const COLORS = [
  'hsl(0 72% 51%)',      // Red
  'hsl(38 92% 50%)',     // Orange
  'hsl(280 60% 50%)',    // Purple
  'hsl(200 80% 50%)',    // Blue
  'hsl(152 45% 45%)',    // Green
  'hsl(330 70% 55%)',    // Pink
];

export const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({ data }) => {
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
      showLabels: !mobile && data.length <= 6,
      radii: mobile ? { inner: 46, outer: 70 } : { inner: 55, outer: 85 },
    };
  }, [isMobile, data.length]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{item.category}</p>
          <p className="text-sm text-muted-foreground">
            Amount: <span className="font-semibold text-danger">{formatCurrency(item.amount)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Share: <span className="font-semibold">{item.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Expense Breakdown</h3>
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          No expense data available this month
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Expense Breakdown by Category</h3>
      <div className="h-80 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={radii.inner}
              outerRadius={radii.outer}
              paddingAngle={3}
              dataKey="amount"
              nameKey="category"
              label={showLabels ? ({ category, percentage }) => `${category} (${percentage}%)` : false}
              labelLine={showLabels ? { stroke: 'hsl(220 10% 65%)', strokeWidth: 1 } : false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={40}
              formatter={(value: string) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
              wrapperStyle={{ paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
