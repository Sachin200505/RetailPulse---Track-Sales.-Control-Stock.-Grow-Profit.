// Inventory Service - API calls for inventory management with backend API
import { api } from '@/lib/api';

export interface InventorySummary {
  totalStockValue: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  deadStockProducts: number;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  costPrice: number;
  stockValue: number;
  lastSold: string | null;
  status: 'healthy' | 'low' | 'out' | 'dead';
  expiryDate?: string | null;
}

// Low stock threshold
const LOW_STOCK_THRESHOLD = 10;

// Dead stock days threshold
const DEAD_STOCK_DAYS = 30;

const mapProduct = (p: any) => ({
  id: p._id || p.id,
  name: p.name,
  category: p.category,
  stock: Number(p.stock ?? 0),
  costPrice: Number(p.costPrice ?? p.cost_price ?? 0),
  isActive: p.isActive ?? p.is_active ?? true,
  expiryDate: p.expiryDate || p.expiry_date || null,
});

export const inventoryService = {
  // Get inventory summary from real data
  async getSummary(): Promise<InventorySummary> {
    const products = await api.get<any[]>(`/api/products`);
    const items = (products || []).map(mapProduct).filter(p => p.isActive);

    const totalStockValue = items.reduce((sum, item) => sum + (item.stock * item.costPrice), 0);
    const lowStockProducts = items.filter(i => i.stock > 0 && i.stock <= LOW_STOCK_THRESHOLD).length;
    const outOfStockProducts = items.filter(i => i.stock === 0).length;
    
    // Get dead stock (products not sold in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DEAD_STOCK_DAYS);
    
    const recentTransactions = await api.get<any[]>(`/api/transactions`);

    // Get product IDs that were sold recently
    const recentlySoldProductIds = new Set<string>();
    (recentTransactions || []).forEach(t => {
      const items = t.items as any[];
      const createdAt = new Date(t.createdAt || t.created_at || Date.now());
      if (createdAt < thirtyDaysAgo) return;
      items.forEach(item => {
        if (item.productId) recentlySoldProductIds.add(item.productId);
      });
    });

    // Dead stock = in stock but not sold in 30 days
    const deadStockProducts = items.filter(
      i => i.stock > 0 && !recentlySoldProductIds.has(i.id)
    ).length;

    return {
      totalStockValue,
      totalProducts: items.length,
      lowStockProducts,
      outOfStockProducts,
      deadStockProducts,
    };
  },

  // Get all inventory items with status
  async getAll(): Promise<StockItem[]> {
    const [products, transactions] = await Promise.all([
      api.get<any[]>(`/api/products`),
      api.get<any[]>(`/api/transactions`),
    ]);

    const activeProducts = (products || []).map(mapProduct).filter(p => p.isActive);

    // Get last sold dates from transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DEAD_STOCK_DAYS);

    const sortedTx = (transactions || []).slice().sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime());

    // Map product IDs to their last sold date
    const lastSoldMap = new Map<string, string>();
    const recentlySoldIds = new Set<string>();

    sortedTx.forEach(t => {
      const items = t.items as any[];
      const createdAt = t.createdAt || t.created_at;
      if (!createdAt) return;
      items.forEach(item => {
        if (item.productId && !lastSoldMap.has(item.productId)) {
          lastSoldMap.set(item.productId, createdAt);
        }
        if (new Date(createdAt) >= thirtyDaysAgo) {
          recentlySoldIds.add(item.productId);
        }
      });
    });

    return activeProducts.map(p => {
      const lastSoldDate = lastSoldMap.get(p.id);
      let status: 'healthy' | 'low' | 'out' | 'dead' = 'healthy';

      if (p.stock === 0) {
        status = 'out';
      } else if (p.stock <= LOW_STOCK_THRESHOLD) {
        status = 'low';
      } else if (p.stock > 0 && !recentlySoldIds.has(p.id)) {
        status = 'dead';
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        costPrice: p.costPrice,
        stockValue: p.stock * p.costPrice,
        lastSold: lastSoldDate ? new Date(lastSoldDate).toLocaleDateString() : null,
        status,
        expiryDate: p.expiryDate || null,
      };
    });
  },

  // Get low stock items
  async getLowStock(): Promise<StockItem[]> {
    const items = await this.getAll();
    return items.filter(i => i.status === 'low');
  },

  // Get out of stock items
  async getOutOfStock(): Promise<StockItem[]> {
    const items = await this.getAll();
    return items.filter(i => i.status === 'out');
  },

  // Get dead stock items (not sold in 30+ days)
  async getDeadStock(): Promise<StockItem[]> {
    const items = await this.getAll();
    return items.filter(i => i.status === 'dead');
  },

  // Get stock by category
  async getByCategory(category: string): Promise<StockItem[]> {
    const items = await this.getAll();
    return items.filter(i => i.category === category);
  },

  // Update stock quantity
  async updateStock(id: string, newStock: number): Promise<StockItem | null> {
    await api.put(`/api/products/${id}`, { stock: newStock });
    const items = await this.getAll();
    return items.find(i => i.id === id) || null;
  },

  // Decrease stock after sale
  async decreaseStock(productId: string, quantity: number): Promise<void> {
    const product = await api.get<any>(`/api/products/${productId}`);
    const newStock = Math.max(0, (product?.stock ?? 0) - quantity);
    await api.put(`/api/products/${productId}`, { stock: newStock });
  },
};
