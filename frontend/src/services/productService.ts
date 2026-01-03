// Product Service - API calls for product management using Express backend
import { api } from '@/lib/api';

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  sku: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  expiryDate?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface CategoryGst {
  name: string;
  gstRate: number;
  productCount: number;
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export const getStockStatus = (stock: number): StockStatus => {
  if (stock === 0) return 'out-of-stock';
  if (stock <= 10) return 'low-stock';
  return 'in-stock';
};

// Transform database row to Product interface
const transformProduct = (row: any): Product => ({
  id: row.id || row._id,
  name: row.name,
  category: row.category,
  costPrice: Number(row.costPrice ?? row.cost_price ?? 0),
  sellingPrice: Number(row.sellingPrice ?? row.selling_price ?? 0),
  stock: row.stock,
  sku: row.sku,
  description: row.description,
  isActive: row.isActive ?? row.is_active ?? true,
  createdAt: row.createdAt || row.created_at,
  expiryDate: row.expiryDate || row.expiry_date || undefined,
});

export const productService = {
  // Get all products
  async getAll(): Promise<Product[]> {
    const data = await api.get<any[]>("/api/products");
    return (data || []).map(transformProduct);
  },

  // Get product by ID
  async getById(id: string): Promise<Product | undefined> {
    const data = await api.get<any>(`/api/products/${id}`);
    return data ? transformProduct(data) : undefined;
  },

  // Search products by name
  async search(query: string): Promise<Product[]> {
    const data = await api.get<any[]>(`/api/products?search=${encodeURIComponent(query)}`);
    return (data || []).map(transformProduct);
  },

  // Get products by category
  async getByCategory(category: string): Promise<Product[]> {
    const data = await api.get<any[]>(`/api/products?search=${encodeURIComponent(category)}`);
    return (data || []).map(transformProduct).filter(p => p.category === category);
  },

  // Get low stock products
  async getLowStock(threshold: number = 10): Promise<Product[]> {
    const data = await api.get<any[]>("/api/products");
    return (data || []).map(transformProduct).filter(p => p.stock > 0 && p.stock <= threshold);
  },

  // Get out of stock products
  async getOutOfStock(): Promise<Product[]> {
    const data = await api.get<any[]>("/api/products");
    return (data || []).map(transformProduct).filter(p => p.stock === 0);
  },

  // Add new product
  async add(product: Omit<Product, 'id' | 'createdAt' | 'isActive'>): Promise<Product> {
    const payload: any = {
      name: product.name,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      sku: product.sku,
      description: product.description,
      isActive: true,
      expiryDate: product.expiryDate,
    };

    const data = await api.post<any>("/api/products", payload);
    return transformProduct(data);
  },

  // Update product
  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const updateData: any = { ...updates };
    const data = await api.put<any>(`/api/products/${id}`, updateData);
    return data ? transformProduct(data) : null;
  },

  // Delete product (soft delete)
  async delete(id: string): Promise<boolean> {
    await api.del(`/api/products/${id}`);
    return true;
  },

  // Get all categories
  async getCategories(): Promise<string[]> {
    const data = await api.get<any[]>("/api/products/categories/gst");
    return (data || []).map((c: any) => c.name);
  },

  async getCategoriesGst(): Promise<CategoryGst[]> {
    const data = await api.get<any[]>("/api/products/categories/gst");
    return (data || []).map((c) => ({
      name: c.name,
      gstRate: Number(c.gstRate ?? 0),
      productCount: Number(c.productCount ?? 0),
    }));
  },

  async updateCategoryGst(name: string, gstRate: number): Promise<CategoryGst> {
    const data = await api.patch<any>(`/api/products/categories/gst/${encodeURIComponent(name)}`, { gstRate });
    return {
      name: data.name || name,
      gstRate: Number(data.gstRate ?? gstRate),
      productCount: 0,
    };
  },

  // Add new category
  async addCategory(name: string, description?: string): Promise<ProductCategory> {
    return {
      id: name,
      name,
      description,
      createdAt: new Date().toISOString(),
    };
  },

  // Update stock
  async updateStock(id: string, quantity: number): Promise<Product | null> {
    const current = await this.getById(id);
    const newStock = Math.max(0, (current?.stock ?? 0) + quantity);
    const data = await api.put<any>(`/api/products/${id}`, { stock: newStock });
    return data ? transformProduct(data) : null;
  },

  // Bulk import products from CSV data
  async bulkImport(products: Array<Omit<Product, 'id' | 'createdAt' | 'isActive'>>): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    for (const product of products) {
      try {
        await api.post(`/api/products`, {
          name: product.name,
          category: product.category,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          stock: product.stock,
          sku: product.sku,
          description: product.description,
          isActive: true,
          expiryDate: product.expiryDate,
        });
        success++;
      } catch (e: any) {
        failed++;
        errors.push(`${product.sku}: ${e.message}`);
      }
    }

    return { success, failed, errors };
  },
};
