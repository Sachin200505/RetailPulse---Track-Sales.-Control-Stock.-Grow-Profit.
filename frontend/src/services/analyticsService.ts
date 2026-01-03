// Analytics Service - Real data from backend API
import { api } from '@/lib/api';

export interface ProductSalesData {
  productId: string;
  productName: string;
  category: string;
  quantitySold: number;
  revenue: number;
  profit: number;
}

export interface CategoryProfitData {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface SalesSummary {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  averageOrderValue: number;
  topCategory: string;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface DailyRevenueData {
  date: string;
  revenue: number;
  orders: number;
  profit: number;
}

export type DateFilter = 'today' | 'week' | 'month' | 'custom';

type DateRange = { start: Date; end: Date };

const getDateRange = (filter: DateFilter): DateRange => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  switch (filter) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
};

const toDate = (value: any) => new Date(value || Date.now());
const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;

export const analyticsService = {
  async getSalesSummary(filter: DateFilter): Promise<SalesSummary> {
    const { start, end } = getDateRange(filter);
    const transactions = await api.get<any[]>(`/api/transactions`);
    const products = await api.get<any[]>(`/api/products`);

    const productMap: Record<string, { category: string; costPrice: number; sellingPrice: number }> = {};
    (products || []).forEach(p => {
      productMap[p._id || p.id] = {
        category: p.category,
        costPrice: Number(p.costPrice ?? p.cost_price),
        sellingPrice: Number(p.sellingPrice ?? p.selling_price),
      };
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    const categoryRevenue: Record<string, number> = {};

    const filtered = (transactions || []).filter(t => inRange(toDate(t.createdAt || t.created_at), start, end));

    filtered.forEach(t => {
      totalRevenue += Number(t.totalAmount ?? t.total_amount);
      const items = t.items as any[];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const product = productMap[item.productId];
          if (product) {
            const itemProfit = (product.sellingPrice - product.costPrice) * item.quantity;
            totalProfit += itemProfit;
            categoryRevenue[product.category] = (categoryRevenue[product.category] || 0) + item.subtotal;
          }
        });
      }
    });

    const topCategory = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalRevenue,
      totalProfit,
      totalOrders: filtered.length,
      averageOrderValue: filtered.length ? totalRevenue / filtered.length : 0,
      topCategory,
    };
  },

  async getProductSales(filter: DateFilter): Promise<ProductSalesData[]> {
    const { start, end } = getDateRange(filter);
    const transactions = await api.get<any[]>(`/api/transactions`);
    const products = await api.get<any[]>(`/api/products`);

    const productMap: Record<string, { name: string; category: string; costPrice: number; sellingPrice: number }> = {};
    (products || []).forEach(p => {
      productMap[p._id || p.id] = {
        name: p.name,
        category: p.category,
        costPrice: Number(p.costPrice ?? p.cost_price),
        sellingPrice: Number(p.sellingPrice ?? p.selling_price),
      };
    });

    const productStats: Record<string, ProductSalesData> = {};

    (transactions || []).forEach(t => {
      const createdAt = toDate(t.createdAt || t.created_at);
      if (!inRange(createdAt, start, end)) return;
      const items = t.items as any[];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const product = productMap[item.productId];
          if (product) {
            if (!productStats[item.productId]) {
              productStats[item.productId] = {
                productId: item.productId,
                productName: product.name,
                category: product.category,
                quantitySold: 0,
                revenue: 0,
                profit: 0,
              };
            }
            productStats[item.productId].quantitySold += item.quantity;
            productStats[item.productId].revenue += item.subtotal;
            productStats[item.productId].profit += (product.sellingPrice - product.costPrice) * item.quantity;
          }
        });
      }
    });

    return Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
  },

  async getCategoryProfit(filter: DateFilter): Promise<CategoryProfitData[]> {
    const { start, end } = getDateRange(filter);
    const transactions = await api.get<any[]>(`/api/transactions`);
    const products = await api.get<any[]>(`/api/products`);

    const productMap: Record<string, { category: string; costPrice: number; sellingPrice: number }> = {};
    (products || []).forEach(p => {
      productMap[p._id || p.id] = {
        category: p.category,
        costPrice: Number(p.costPrice ?? p.cost_price),
        sellingPrice: Number(p.sellingPrice ?? p.selling_price),
      };
    });

    const categoryStats: Record<string, { revenue: number; cost: number }> = {};

    (transactions || []).forEach(t => {
      const createdAt = toDate(t.createdAt || t.created_at);
      if (!inRange(createdAt, start, end)) return;
      const items = t.items as any[];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const product = productMap[item.productId];
          if (product) {
            if (!categoryStats[product.category]) {
              categoryStats[product.category] = { revenue: 0, cost: 0 };
            }
            categoryStats[product.category].revenue += item.subtotal;
            categoryStats[product.category].cost += product.costPrice * item.quantity;
          }
        });
      }
    });

    return Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        revenue: stats.revenue,
        cost: stats.cost,
        profit: stats.revenue - stats.cost,
        margin: stats.revenue > 0 ? Math.round(((stats.revenue - stats.cost) / stats.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  },

  async getDailyRevenue(filter: DateFilter): Promise<DailyRevenueData[]> {
    const { start, end } = getDateRange(filter);
    const transactions = await api.get<any[]>(`/api/transactions`);
    const products = await api.get<any[]>(`/api/products`);

    const productMap: Record<string, { costPrice: number; sellingPrice: number }> = {};
    (products || []).forEach(p => {
      productMap[p._id || p.id] = {
        costPrice: Number(p.costPrice ?? p.cost_price),
        sellingPrice: Number(p.sellingPrice ?? p.selling_price),
      };
    });

    const dailyStats: Record<string, { revenue: number; orders: number; profit: number }> = {};

    (transactions || []).forEach(t => {
      const createdAtRaw = t.createdAt || t.created_at;
      if (!createdAtRaw) return;
      const createdAt = toDate(createdAtRaw);
      if (!inRange(createdAt, start, end)) return;
      const date = createdAtRaw.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { revenue: 0, orders: 0, profit: 0 };
      }
      dailyStats[date].revenue += Number(t.totalAmount ?? t.total_amount);
      dailyStats[date].orders += 1;
      const items = t.items as any[];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const product = productMap[item.productId];
          if (product) {
            dailyStats[date].profit += (product.sellingPrice - product.costPrice) * item.quantity;
          }
        });
      }
    });

    const result: DailyRevenueData[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const stats = dailyStats[dateStr] || { revenue: 0, orders: 0, profit: 0 };
      result.push({
        date: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: stats.revenue,
        orders: stats.orders,
        profit: stats.profit,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  },

  async getPaymentMethodBreakdown(filter: DateFilter): Promise<PaymentMethodData[]> {
    const { start, end } = getDateRange(filter);
    const transactions = await api.get<any[]>(`/api/transactions`);

    const methodStats: Record<string, { count: number; amount: number }> = {};
    let totalAmount = 0;

    (transactions || []).forEach(t => {
      const createdAt = toDate(t.createdAt || t.created_at);
      if (!inRange(createdAt, start, end)) return;
      const method = t.paymentMethod || t.payment_method || 'unknown';
      if (!methodStats[method]) {
        methodStats[method] = { count: 0, amount: 0 };
      }
      const amount = Number(t.totalAmount ?? t.total_amount);
      methodStats[method].count += 1;
      methodStats[method].amount += amount;
      totalAmount += amount;
    });

    return Object.entries(methodStats)
      .map(([method, stats]) => ({
        method: method.toUpperCase(),
        count: stats.count,
        amount: stats.amount,
        percentage: totalAmount > 0 ? Math.round((stats.amount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  },

  async getSalesTrend(filter: DateFilter): Promise<{ date: string; sales: number }[]> {
    const data = await this.getDailyRevenue(filter);
    return data.map(d => ({ date: d.date, sales: d.revenue }));
  },
};
