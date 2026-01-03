import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  ShoppingCart,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { dashboardService, DashboardStats, TopProduct, CategorySales, RevenueDataPoint, ExpenseByCategory } from '@/services/dashboardService';
import { TopProductsChart } from '@/components/charts/TopProductsChart';
import { RevenueTrendChart } from '@/components/charts/RevenueTrendChart';
import { CategorySalesChart } from '@/components/charts/CategorySalesChart';
import { ProfitRevenueChart } from '@/components/charts/ProfitRevenueChart';
import { ExpenseBreakdownChart } from '@/components/charts/ExpenseBreakdownChart';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBg, subtitle }) => (
  <div className="stat-card">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="stat-card-label truncate">{title}</p>
        <p className="stat-card-value mt-0.5">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <div className={`stat-card-icon flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
    </div>
  </div>
);

const formatCurrency = (amount: number): string => {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueDataPoint[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, productsData, categoryData, trendData, expensesData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getTopProducts(),
          dashboardService.getCategorySales(),
          dashboardService.getRevenueTrend(),
          dashboardService.getExpensesByCategory(),
        ]);
        
        setStats(statsData);
        setTopProducts(productsData);
        setCategorySales(categoryData);
        setRevenueTrend(trendData);
        setExpensesByCategory(expensesData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid - Compact 2x3 on mobile, 3x2 on tablet, 6x1 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          title="Today"
          value={formatCurrency(stats?.todayRevenue || 0)}
          icon={<DollarSign className="w-4 h-4 text-white" />}
          iconBg=""
        />
        <StatCard
          title="Monthly"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          icon={<TrendingUp className="w-4 h-4 text-white" />}
          iconBg=""
        />
        <StatCard
          title="Profit"
          value={formatCurrency(stats?.netProfit || 0)}
          icon={<DollarSign className="w-4 h-4 text-white" />}
          iconBg=""
          subtitle="This month"
        />
        <StatCard
          title="Sold"
          value={stats?.totalProductsSold.toLocaleString() || 0}
          icon={<ShoppingCart className="w-4 h-4 text-white" />}
          iconBg=""
          subtitle="This month"
        />
        <StatCard
          title="Products"
          value={stats?.totalProducts || 0}
          icon={<Package className="w-4 h-4 text-white" />}
          iconBg=""
        />
        <StatCard
          title="Low Stock"
          value={stats?.lowStockCount || 0}
          icon={<AlertTriangle className="w-4 h-4 text-white" />}
          iconBg=""
          subtitle="Needs attention"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductsChart data={topProducts} />
        <RevenueTrendChart data={revenueTrend} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategorySalesChart data={categorySales} />
        <ExpenseBreakdownChart data={expensesByCategory} />
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 gap-4">
        <ProfitRevenueChart data={revenueTrend} />
      </div>
    </div>
  );
};

export default Dashboard;
