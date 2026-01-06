// Dashboard Service - Real data from backend API
import { api } from '@/lib/api';

export interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  netProfit: number;
  totalProductsSold: number;
  lowStockCount: number;
  totalProducts: number;
  totalCustomers: number;
  monthlyExpenses: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  profit: number;
}

export interface TopProduct {
  name: string;
  sold: number;
  revenue: number;
}

export interface CategorySales {
  category: string;
  sales: number;
  percentage: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  percentage: number;
}

const normalizeTransactions = (transactions: any[] = []) =>
  (transactions || []).map((t) => ({
    ...t,
    createdAtDate: new Date(t.createdAt || t.created_at || 0),
    total: Number(t.totalAmount ?? t.total_amount ?? 0),
    paymentStatus: t.paymentStatus || t.payment_status || "completed",
    isRefunded: t.isRefunded ?? t.is_refunded ?? false,
    refundId: t.refundId || t.refund_id || null,
    items: Array.isArray(t.items) ? t.items : [],
  }));

const isCompleted = (tx: any) => (tx.paymentStatus || "completed") === "completed";

const formatDateLocal = (date: Date) => date.toLocaleDateString("en-CA");

const buildRefundMap = (refunds: any[] = []) => {
  const map: Record<string, number> = {};
  refunds.forEach((r) => {
    const txId = (r.transaction?._id || r.transaction || "").toString();
    if (!txId) return;
    const amount = Number(r.refundAmount ?? r.refund_amount ?? 0);
    map[txId] = Math.max(0, amount);
  });
  return map;
};

const adjustedTotal = (tx: any, refundMap: Record<string, number>) => {
  const refund = refundMap[tx._id || tx.id || ""] || 0;
  return Math.max(0, tx.total - refund);
};

// Scale item-level values when a transaction is partially refunded so category/product views stay consistent.
const getAdjustedItems = (tx: any, refundMap: Record<string, number>) => {
  const total = tx.total || 0;
  const refund = refundMap[tx._id || tx.id || ""] || 0;
  if (!total || !tx.items?.length) return tx.items || [];
  const factor = Math.max(0, Math.min(1, (total - refund) / total));
  if (factor === 1) return tx.items;
  if (factor === 0) return [];
  return tx.items.map((item: any) => ({
    ...item,
    quantity: (item.quantity || 0) * factor,
    subtotal: (item.subtotal || 0) * factor,
  }));
};

export const dashboardService = {
  // Get dashboard statistics
  async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [transactionsRaw, productsRaw, customersRaw, expensesRaw, refundsRaw] = await Promise.all([
      api.get<any[]>(`/api/transactions`),
      api.get<any[]>(`/api/products`),
      api.get<any[]>(`/api/customers`),
      api.get<any[]>(`/api/expenses`),
      api.get<any[]>(`/api/refunds`),
    ]);

    const refundMap = buildRefundMap(refundsRaw);
    const transactions = normalizeTransactions(transactionsRaw).filter(isCompleted);
    const products = (productsRaw || []).filter(p => p.isActive ?? p.is_active ?? true);
    const customers = customersRaw || [];
    const expenses = expensesRaw || [];

    const inRange = (start: Date, end: Date) =>
      transactions.filter(t => t.createdAtDate >= start && t.createdAtDate <= end);

    const todayTransactions = inRange(startOfToday, endOfToday);
    const monthlyTransactions = inRange(startOfMonth, endOfMonth);

    const sumRevenue = (txs: any[]) => txs.reduce((sum, t) => sum + adjustedTotal(t, refundMap), 0);
    const todayRevenue = sumRevenue(todayTransactions);
    const monthlyRevenue = sumRevenue(monthlyTransactions);

    let totalProductsSold = 0;
    monthlyTransactions.forEach(t => {
      getAdjustedItems(t, refundMap).forEach((item: any) => {
        totalProductsSold += item.quantity || 0;
      });
    });

    const lowStockCount = products.filter(p => (p.stock ?? 0) <= 10 && (p.stock ?? 0) > 0).length;
    const totalProducts = products.length;
    const totalCustomers = customers.length;

    const totalExpenses = expenses
      .filter((e: any) => {
        const dateStr = e.expenseDate || e.expense_date;
        if (!dateStr) return false;
        const dt = new Date(dateStr);
        return dt >= startOfMonth && dt <= endOfMonth;
      })
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const estimatedCost = monthlyRevenue * 0.75;
    const netProfit = monthlyRevenue - estimatedCost - totalExpenses;

    return {
      todayRevenue,
      monthlyRevenue,
      netProfit,
      totalProductsSold,
      lowStockCount,
      totalProducts,
      totalCustomers,
      monthlyExpenses: totalExpenses,
    };
  },

  // Get revenue trend data (last 14 days for daily, last 12 months for monthly)
  async getRevenueTrend(view: 'daily' | 'monthly' = 'daily'): Promise<RevenueDataPoint[]> {
    if (view === 'monthly') {
      return this.getMonthlyRevenueTrend();
    }
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 13);

    const [transactionsRaw, refundsRaw] = await Promise.all([
      api.get<any[]>(`/api/transactions`),
      api.get<any[]>(`/api/refunds`),
    ]);
    const refundMap = buildRefundMap(refundsRaw);
    const tx = normalizeTransactions(transactionsRaw).filter(isCompleted);
    const revenueByDate: Record<string, number> = {};
    tx.forEach(t => {
      if (t.createdAtDate < startDate || t.createdAtDate > endDate) return;
      const date = formatDateLocal(t.createdAtDate);
      revenueByDate[date] = (revenueByDate[date] || 0) + adjustedTotal(t, refundMap);
    });

    const result: RevenueDataPoint[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = formatDateLocal(date);
      const revenue = revenueByDate[dateStr] || 0;
      result.push({
        date: dateStr,
        revenue,
        profit: revenue * 0.25,
      });
    }

    return result;
  },

  // Get monthly revenue trend (last 12 months)
  async getMonthlyRevenueTrend(): Promise<RevenueDataPoint[]> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    const [transactionsRaw, refundsRaw] = await Promise.all([
      api.get<any[]>(`/api/transactions`),
      api.get<any[]>(`/api/refunds`),
    ]);
    const refundMap = buildRefundMap(refundsRaw);
    const tx = normalizeTransactions(transactionsRaw).filter(isCompleted);

    const revenueByMonth: Record<string, number> = {};
    tx.forEach(t => {
      if (t.createdAtDate < startDate || t.createdAtDate > endDate) return;
      const monthKey = `${t.createdAtDate.getFullYear()}-${String(t.createdAtDate.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + adjustedTotal(t, refundMap);
    });

    const result: RevenueDataPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const revenue = revenueByMonth[monthKey] || 0;
      result.push({
        date: monthKey,
        revenue,
        profit: revenue * 0.25,
      });
    }

    return result;
  },

  // Get top selling products
  async getTopProducts(limit: number = 5): Promise<TopProduct[]> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [transactionsRaw, refundsRaw] = await Promise.all([
      api.get<any[]>(`/api/transactions`),
      api.get<any[]>(`/api/refunds`),
    ]);
    const refundMap = buildRefundMap(refundsRaw);
    const tx = normalizeTransactions(transactionsRaw).filter(isCompleted);

    const productStats: Record<string, { name: string; sold: number; revenue: number }> = {};
    
    tx.forEach(t => {
      if (t.createdAtDate < startOfMonth) return;
      const adjustedItems = getAdjustedItems(t, refundMap);
      adjustedItems.forEach((item: any) => {
        const key = item.productName || item.productId;
        if (!productStats[key]) {
          productStats[key] = { name: item.productName || key, sold: 0, revenue: 0 };
        }
        productStats[key].sold += item.quantity || 0;
        productStats[key].revenue += item.subtotal || 0;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  // Get category-wise sales
  async getCategorySales(): Promise<CategorySales[]> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const [transactionsRaw, productsRaw, refundsRaw] = await Promise.all([
      api.get<any[]>(`/api/transactions`),
      api.get<any[]>(`/api/products`),
      api.get<any[]>(`/api/refunds`),
    ]);

    const refundMap = buildRefundMap(refundsRaw);
    const tx = normalizeTransactions(transactionsRaw).filter(isCompleted);
    const productCategories: Record<string, string> = {};
    (productsRaw || []).forEach(p => {
      productCategories[p._id || p.id] = p.category;
    });

    const categorySales: Record<string, number> = {};
    let totalSales = 0;
    
    tx.forEach(t => {
      if (t.createdAtDate < startOfMonth) return;
      getAdjustedItems(t, refundMap).forEach((item: any) => {
        const category = productCategories[item.productId] || 'Other';
        const amount = item.subtotal || 0;
        categorySales[category] = (categorySales[category] || 0) + amount;
        totalSales += amount;
      });
    });

    return Object.entries(categorySales)
      .map(([category, sales]) => ({
        category,
        sales,
        percentage: totalSales > 0 ? Math.round((sales / totalSales) * 100) : 0,
      }))
      .sort((a, b) => b.sales - a.sales);
  },

  // Get expenses by category
  async getExpensesByCategory(): Promise<ExpenseByCategory[]> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const expenses = await api.get<any[]>(`/api/expenses`);

    const categoryExpenses: Record<string, number> = {};
    let totalExpenses = 0;
    
    (expenses || []).forEach(e => {
      const dateStr = e.expenseDate || e.expense_date;
      if (!dateStr) return;
      const dt = new Date(dateStr);
      if (dt < startOfMonth || dt > endOfMonth) return;
      const amount = Number(e.amount);
      categoryExpenses[e.category] = (categoryExpenses[e.category] || 0) + amount;
      totalExpenses += amount;
    });

    return Object.entries(categoryExpenses)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  },

  // Get profit vs revenue data
  async getProfitVsRevenue(): Promise<RevenueDataPoint[]> {
    return this.getRevenueTrend();
  },
};
