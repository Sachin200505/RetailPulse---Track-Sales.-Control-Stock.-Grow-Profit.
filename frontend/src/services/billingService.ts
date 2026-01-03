// Billing Service - interacts with Express backend
import { api } from '@/lib/api';
import { Product, productService } from './productService';

export interface BillItem {
  product: Product;
  quantity: number;
  subtotal: number;
  gstRate?: number;
  gstAmount?: number;
  totalWithGst?: number;
}

export interface Bill {
  id: string;
  invoice_number: string;
  items: BillItem[];
  subtotal: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  payment_method: 'cash' | 'upi' | 'card';
  payment_status: string;
  customer_id?: string;
  customer_code?: string;
  checkout_locked: boolean;
  is_refunded: boolean;
  created_at: string;
  customer_name?: string;
  customer_mobile?: string;
}

// Session-based checkout lock to prevent double billing
// Use WeakRef pattern to allow garbage collection
let activeCheckouts: Set<string> = new Set();

// Clear stale checkouts on page load
if (typeof window !== 'undefined') {
  activeCheckouts = new Set();
}

export const billingService = {
  // Calculate bill totals
  calculateTotals(items: BillItem[], discountPercent: number = 0, extraFlatDiscount: number = 0): {
    subtotal: number;
    gstAmount: number;
    discount: number;
    totalAmount: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const pctDiscount = (subtotal * discountPercent) / 100;
    const discount = pctDiscount + extraFlatDiscount;
    const discountFactor = subtotal > 0 ? Math.max(0, (subtotal - discount) / subtotal) : 1;
    const gstAmount = items.reduce((sum, item) => sum + (item.gstAmount || 0) * discountFactor, 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const totalAmount = taxableAmount + gstAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  },

  // Generate checkout session ID
  generateCheckoutSessionId(): string {
    return `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Lock checkout session to prevent double billing
  lockCheckout(sessionId: string): boolean {
    if (activeCheckouts.has(sessionId)) {
      return false; // Already locked
    }
    activeCheckouts.add(sessionId);
    return true;
  },

  // Unlock checkout session
  unlockCheckout(sessionId: string): void {
    activeCheckouts.delete(sessionId);
  },

  // Check if checkout is locked
  isCheckoutLocked(sessionId: string): boolean {
    return activeCheckouts.has(sessionId);
  },

  // Verify stock availability before checkout
  async verifyStockAvailability(items: BillItem[]): Promise<{ available: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    for (const item of items) {
      try {
        const product = await productService.getById(item.product.id);
        if (!product) {
          issues.push(`Product ${item.product.name} not found`);
          continue;
        }
        if (product.stock < item.quantity) {
          issues.push(`${product.name}: Only ${product.stock} in stock (requested ${item.quantity})`);
        }
      } catch (error) {
        issues.push(`Product ${item.product.name} not reachable`);
      }
    }
    
    return { available: issues.length === 0, issues };
  },

  // Lock stock in database during checkout
  async lockStockForCheckout(transactionId: string, items: BillItem[]): Promise<boolean> {
    // Backend handles transactional lock; no-op placeholder for compatibility
    return !!transactionId && items.length > 0;
  },

  // Decrease stock with negative prevention
  async decreaseStock(productId: string, quantity: number): Promise<boolean> {
    // Stock is adjusted server-side during transaction creation
    return true;
  },

  // Create low stock alert
  async createLowStockAlert(productId: string, stockLevel: number): Promise<void> {
    console.warn("Low stock alert placeholder", { productId, stockLevel });
  },

  // Rollback stock on failure
  async rollbackStock(items: { productId: string; quantity: number }[]): Promise<void> {
    // Backend transaction creation is atomic; no rollback on client
  },

  // Create transaction with atomic operations
  async createTransaction(data: {
    invoiceNumber: string;
    customerId: string | null;
    items: BillItem[];
    subtotal: number;
    gstAmount: number;
    discount: number;
    totalAmount: number;
    paymentMethod: 'cash' | 'upi' | 'card';
    creditPointsEarned: number;
  }): Promise<Bill> {
    const payload = {
      invoiceNumber: data.invoiceNumber,
      customerId: data.customerId,
      items: data.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        subtotal: item.subtotal,
        gstAmount: item.gstAmount || 0,
        gstRate: item.gstRate ?? 0,
      })),
      subtotal: data.subtotal,
      gstAmount: data.gstAmount,
      discount: data.discount,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      paymentStatus: "completed",
      creditPointsEarned: data.creditPointsEarned,
    };

    const transaction = await api.post<any>("/api/transactions", payload);

    return {
      id: transaction._id || transaction.id,
      invoice_number: transaction.invoiceNumber,
      items: data.items,
      subtotal: Number(transaction.subtotal),
      gst_amount: Number(transaction.gstAmount),
      discount: Number(transaction.discount),
      total_amount: Number(transaction.totalAmount),
      payment_method: transaction.paymentMethod as 'cash' | 'upi' | 'card',
      payment_status: transaction.paymentStatus,
        customer_id: transaction.customer || undefined,
        customer_code: transaction.customer?.customerCode,
      checkout_locked: transaction.checkoutLocked || false,
      is_refunded: transaction.isRefunded || false,
      created_at: transaction.createdAt || transaction.created_at,
    };
  },

  // Process hardened checkout
  async processHardenedCheckout(
    sessionId: string,
    items: BillItem[],
    customerId: string | null,
    invoiceNumber: string,
    totals: { subtotal: number; gstAmount: number; discount: number; totalAmount: number },
    paymentMethod: 'cash' | 'upi' | 'card',
    creditPointsEarned: number
  ): Promise<{ success: boolean; transaction?: Bill; error?: string }> {
    // 1. Lock checkout session
    if (!this.lockCheckout(sessionId)) {
      return { success: false, error: 'Checkout already in progress' };
    }

    const decreasedItems: { productId: string; quantity: number }[] = [];

    try {
      // 2. Verify stock availability
      const stockCheck = await this.verifyStockAvailability(items);
      if (!stockCheck.available) {
        this.unlockCheckout(sessionId);
        return { success: false, error: stockCheck.issues.join(', ') };
      }

      // 3. Create transaction (backend handles stock and loyalty)
      const transaction = await this.createTransaction({
        invoiceNumber,
        customerId,
        items,
        subtotal: totals.subtotal,
        gstAmount: totals.gstAmount,
        discount: totals.discount,
        totalAmount: totals.totalAmount,
        paymentMethod,
        creditPointsEarned
      });

      // 4. Unlock checkout
      this.unlockCheckout(sessionId);

      return { success: true, transaction };
    } catch (error: any) {
      this.unlockCheckout(sessionId);
      return { success: false, error: error.message || 'Checkout failed' };
    }
  },

  // Get all transactions
  async getAllTransactions(): Promise<Bill[]> {
    const data = await api.get<any[]>(`/api/transactions`);
    return (data || []).map(tx => ({
      id: tx._id || tx.id,
      invoice_number: tx.invoiceNumber,
      items: (tx.items || []).map((item: any) => ({
        product: {
          id: item.productId,
          name: item.productName,
          category: '',
          costPrice: item.unitPrice,
          sellingPrice: item.unitPrice,
          stock: 0,
          sku: item.productId || '',
          description: '',
          isActive: true,
          createdAt: tx.createdAt || tx.created_at,
        },
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      subtotal: Number(tx.subtotal),
      gst_amount: Number(tx.gstAmount),
      discount: Number(tx.discount),
      total_amount: Number(tx.totalAmount),
      payment_method: tx.paymentMethod,
      payment_status: tx.paymentStatus,
      customer_id: tx.customer || tx.customer_id || undefined,
      customer_code: tx.customer?.customerCode,
      checkout_locked: tx.checkoutLocked || false,
      is_refunded: tx.isRefunded || false,
      created_at: tx.createdAt || tx.created_at,
      customer_name: tx.customer?.name || tx.customer_name,
      customer_mobile: tx.customer?.mobile || tx.customer_mobile,
    }));
  },

  // Get recent transactions
  async getRecentTransactions(limit: number = 10): Promise<Bill[]> {
    const data = await api.get<any[]>(`/api/transactions`);
    return (data || []).slice(0, limit).map(t => ({
      id: t._id || t.id,
      invoice_number: t.invoiceNumber,
      items: t.items as any[],
      subtotal: Number(t.subtotal),
      gst_amount: Number(t.gstAmount),
      discount: Number(t.discount),
      total_amount: Number(t.totalAmount),
      payment_method: t.paymentMethod as 'cash' | 'upi' | 'card',
      payment_status: t.paymentStatus,
      customer_id: t.customer || undefined,
      customer_code: t.customer?.customerCode,
      checkout_locked: t.checkoutLocked || false,
      is_refunded: t.isRefunded || false,
      created_at: t.createdAt || t.created_at
    }));
  },

  // Get transaction by ID
  async getTransactionById(id: string): Promise<Bill | null> {
    const data = await api.get<any>(`/api/transactions`);
    const match = (data || []).find((t: any) => (t._id || t.id) === id);
    if (!match) return null;
    return {
      id: match._id || match.id,
      invoice_number: match.invoiceNumber,
      items: match.items as any[],
      subtotal: Number(match.subtotal),
      gst_amount: Number(match.gstAmount),
      discount: Number(match.discount),
      total_amount: Number(match.totalAmount),
      payment_method: match.paymentMethod as 'cash' | 'upi' | 'card',
      payment_status: match.paymentStatus,
      customer_id: match.customer || undefined,
      customer_code: match.customer?.customerCode,
      checkout_locked: match.checkoutLocked || false,
      is_refunded: match.isRefunded || false,
      created_at: match.createdAt || match.created_at
    };
  },

  // Get transaction by invoice number
  async getTransactionByInvoice(invoiceNumber: string): Promise<Bill | null> {
    const data = await api.get<any[]>(`/api/transactions`);
    const match = (data || []).find((t: any) => t.invoiceNumber === invoiceNumber);
    if (!match) return null;
    return {
      id: match._id || match.id,
      invoice_number: match.invoiceNumber,
      items: match.items as any[],
      subtotal: Number(match.subtotal),
      gst_amount: Number(match.gstAmount),
      discount: Number(match.discount),
      total_amount: Number(match.totalAmount),
      payment_method: match.paymentMethod as 'cash' | 'upi' | 'card',
      payment_status: match.paymentStatus,
      customer_id: match.customer || undefined,
      customer_code: match.customer?.customerCode,
      checkout_locked: match.checkoutLocked || false,
      is_refunded: match.isRefunded || false,
      created_at: match.createdAt || match.created_at
    };
  },

  async deleteTransactionsByIds(ids: string[]): Promise<{ deleted: number }> {
    const res = await api.post<{ deleted: number }>(`/api/transactions/bulk-delete`, { ids });
    return res;
  }
};
