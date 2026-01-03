import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, DollarSign, ShoppingCart, ArrowUpRight, ArrowDownRight, CreditCard, Smartphone, Wallet, BarChart3 } from 'lucide-react';
import { analyticsService, DateFilter, ProductSalesData, CategoryProfitData, SalesSummary, PaymentMethodData, DailyRevenueData } from '@/services/analyticsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--danger))'];

const Analytics: React.FC = () => {
  const [filter, setFilter] = useState<DateFilter>('month');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [productSales, setProductSales] = useState<ProductSalesData[]>([]);
  const [categoryProfit, setCategoryProfit] = useState<CategoryProfitData[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryData, salesData, profitData, paymentData, revenueData] = await Promise.all([
        analyticsService.getSalesSummary(filter),
        analyticsService.getProductSales(filter),
        analyticsService.getCategoryProfit(filter),
        analyticsService.getPaymentMethodBreakdown(filter),
        analyticsService.getDailyRevenue(filter),
      ]);
      setSummary(summaryData);
      setProductSales(salesData);
      setCategoryProfit(profitData);
      setPaymentMethods(paymentData);
      setDailyRevenue(revenueData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filterLabels: Record<DateFilter, string> = {
    today: "Today's",
    week: "This Week's",
    month: "This Month's",
    custom: 'Custom',
  };

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'upi': return <Smartphone className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sales Analytics</h2>
          <p className="text-sm text-muted-foreground">{filterLabels[filter]} Performance Overview</p>
        </div>
        
        <div className="flex gap-2 bg-muted rounded-lg p-1">
          {(['today', 'week', 'month'] as DateFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'today' ? 'Day' : f === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Total Revenue</p>
              <p className="stat-card-value mt-1">{formatCurrency(summary?.totalRevenue || 0)}</p>
            </div>
            <div className="stat-card-icon bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <BarChart3 className="w-4 h-4" />
            <span>From {summary?.totalOrders || 0} orders</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Total Profit</p>
              <p className="stat-card-value mt-1">{formatCurrency(summary?.totalProfit || 0)}</p>
            </div>
            <div className="stat-card-icon bg-success/10">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-success">
            <ArrowUpRight className="w-4 h-4" />
            <span>Real profit from sales</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Total Orders</p>
              <p className="stat-card-value mt-1">{summary?.totalOrders || 0}</p>
            </div>
            <div className="stat-card-icon bg-info/10">
              <ShoppingCart className="w-5 h-5 text-info" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <span>Top: {summary?.topCategory || 'N/A'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Avg Order Value</p>
              <p className="stat-card-value mt-1">{formatCurrency(summary?.averageOrderValue || 0)}</p>
            </div>
            <div className="stat-card-icon bg-warning/10">
              <Calendar className="w-5 h-5 text-warning" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <span>Per transaction</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend */}
        <div className="dashboard-card">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Daily Revenue Trend</h3>
            <p className="text-sm text-muted-foreground">Revenue & profit over time</p>
          </div>
          <div className="h-72">
            {dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRevenue}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueGradient)" name="Revenue" />
                  <Area type="monotone" dataKey="profit" stroke="hsl(var(--success))" fill="url(#profitGradient)" name="Profit" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available for this period
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="dashboard-card">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Payment Methods</h3>
            <p className="text-sm text-muted-foreground">Breakdown by payment type</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48">
              {paymentMethods.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="amount"
                    >
                      {paymentMethods.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data
                </div>
              )}
            </div>
            <div className="space-y-3">
              {paymentMethods.map((method, index) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex items-center gap-1">
                      {getPaymentIcon(method.method)}
                      <span className="text-sm font-medium">{method.method}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(method.amount)}</p>
                    <p className="text-xs text-muted-foreground">{method.count} orders ({method.percentage}%)</p>
                  </div>
                </div>
              ))}
              {paymentMethods.length === 0 && (
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Products Chart */}
      <div className="dashboard-card">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Top Selling Products</h3>
          <p className="text-sm text-muted-foreground">Revenue by product</p>
        </div>
        <div className="h-72">
          {productSales.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSales.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <YAxis 
                  type="category" 
                  dataKey="productName" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  width={120}
                  tickFormatter={(v) => v.length > 15 ? `${v.substring(0, 15)}...` : v}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Revenue' : 'Profit']}
                />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[0, 4, 4, 0]} />
                <Bar dataKey="profit" fill="hsl(var(--success))" name="Profit" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No sales data available for this period
            </div>
          )}
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product-wise Sales */}
        <div className="dashboard-card overflow-hidden p-0">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Product-wise Sales</h3>
            <p className="text-sm text-muted-foreground">Detailed sales breakdown</p>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty Sold</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {productSales.length > 0 ? productSales.map(product => (
                  <tr key={product.productId}>
                    <td>
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </td>
                    <td>{product.quantitySold}</td>
                    <td>{formatCurrency(product.revenue)}</td>
                    <td className="text-success">{formatCurrency(product.profit)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground py-8">
                      No sales data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category-wise Profit */}
        <div className="dashboard-card overflow-hidden p-0">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Category-wise Profit</h3>
            <p className="text-sm text-muted-foreground">Profit margins by category</p>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {categoryProfit.length > 0 ? categoryProfit.map(category => (
                  <tr key={category.category}>
                    <td className="font-medium">{category.category}</td>
                    <td>{formatCurrency(category.revenue)}</td>
                    <td className="text-success">{formatCurrency(category.profit)}</td>
                    <td>
                      <span className={`badge-${category.margin >= 20 ? 'success' : category.margin >= 10 ? 'warning' : 'danger'}`}>
                        {category.margin}%
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground py-8">
                      No category data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
