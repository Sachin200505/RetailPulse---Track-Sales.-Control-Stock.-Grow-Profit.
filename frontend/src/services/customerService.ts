// Customer Service - API calls for customer management with Express backend
import { api } from '@/lib/api';

export interface Customer {
  id: string;
  mobile: string;
  name: string;
  customer_code: string;
  credit_points: number;
  points_redeemed: number;
  total_purchases: number;
  tier: 'Bronze' | 'Silver' | 'Gold';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  items: any[];
  subtotal: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  credit_points_earned: number;
  created_at: string;
}

const mapCustomerRecord = (record: any): Customer => {
  const id = record?.id || record?._id;

  return {
    id: id || '',
    mobile: record?.mobile || '',
    name: record?.name || '',
    tier: (record?.tier as 'Bronze' | 'Silver' | 'Gold') || 'Bronze',
    credit_points: record?.creditPoints ?? record?.credit_points ?? 0,
    points_redeemed: record?.pointsRedeemed ?? record?.points_redeemed ?? 0,
    total_purchases: record?.totalPurchases ?? record?.total_purchases ?? 0,
    customer_code: record?.customerCode ?? record?.customer_code ?? '',
    created_at: record?.createdAt ?? record?.created_at ?? '',
    updated_at: record?.updatedAt ?? record?.updated_at ?? '',
  };
};

// Credit points rate: 1 point per ₹100 spent
const CREDIT_POINTS_RATE = 100;

// Points value: 1 point = ₹1 discount
const POINTS_VALUE = 1;

// Tier thresholds
const TIER_THRESHOLDS = {
  Gold: 50000,
  Silver: 20000,
  Bronze: 0,
};

// Tier benefits (bonus multiplier for points)
const TIER_BENEFITS = {
  Gold: { pointsMultiplier: 2.0, discountLimit: 0.20 },    // 2x points, up to 20% discount
  Silver: { pointsMultiplier: 1.5, discountLimit: 0.15 },  // 1.5x points, up to 15% discount
  Bronze: { pointsMultiplier: 1.0, discountLimit: 0.10 },  // 1x points, up to 10% discount
};

export const customerService = {
  // Search customers by mobile or name
  async searchCustomers(query: string): Promise<Customer[]> {
    const isNumeric = /^\d+$/.test(query);
    const data = await api.get<any[]>(`/api/customers/search?q=${encodeURIComponent(query)}`);
    return (data || []).slice(0, 5).map(mapCustomerRecord);
  },

  // Search customer by mobile number
  async searchByMobile(mobile: string): Promise<Customer[]> {
    const data = await api.get<any[]>(`/api/customers/search?q=${encodeURIComponent(mobile)}`);
    return (data || []).slice(0, 5).map(mapCustomerRecord);
  },

  // Get customer by mobile
  async getByMobile(mobile: string): Promise<Customer | null> {
    const data = await api.get<any[]>(`/api/customers/search?q=${encodeURIComponent(mobile)}`);
    const record = (data || []).find(c => c.mobile === mobile);
    if (!record) return null;
    return mapCustomerRecord(record);
  },

  // Get customer by ID
  async getById(id: string): Promise<Customer | null> {
    const data = await api.get<any>(`/api/customers/${id}`);
    if (!data) return null;
    return mapCustomerRecord(data);
  },

  // Create or update customer
  async upsertCustomer(mobile: string, name: string): Promise<Customer> {
    const data = await api.post<any>(`/api/customers/upsert`, { mobile, name });
    return mapCustomerRecord(data);
  },

  // Calculate tier based on total purchases
  calculateTier(totalPurchases: number): 'Bronze' | 'Silver' | 'Gold' {
    if (totalPurchases >= TIER_THRESHOLDS.Gold) return 'Gold';
    if (totalPurchases >= TIER_THRESHOLDS.Silver) return 'Silver';
    return 'Bronze';
  },

  // Get tier benefits
  getTierBenefits(tier: 'Bronze' | 'Silver' | 'Gold') {
    return TIER_BENEFITS[tier];
  },

  // Add credit points after purchase
  async addCreditPoints(customerId: string, purchaseAmount: number): Promise<number> {
    const customer = await this.getById(customerId);
    if (!customer) throw new Error('Customer not found');

    const benefits = TIER_BENEFITS[customer.tier];

    // Calculate points with tier multiplier
    const basePoints = Math.floor(purchaseAmount / CREDIT_POINTS_RATE);
    const pointsEarned = Math.floor(basePoints * benefits.pointsMultiplier);

    const newTotalPurchases = Number(customer.total_purchases) + purchaseAmount;
    const newTier = this.calculateTier(newTotalPurchases);

    await api.post(`/api/customers/${customerId}/loyalty`, {
      creditPoints: (customer.credit_points || 0) + pointsEarned,
      totalPurchases: newTotalPurchases,
      tier: newTier,
      pointsRedeemed: customer.points_redeemed,
    });

    return pointsEarned;
  },

  // Redeem points for discount
  async redeemPoints(customerId: string, pointsToRedeem: number, billAmount: number): Promise<{ discount: number; pointsUsed: number }> {
    const customer = await this.getById(customerId);
    if (!customer) throw new Error('Customer not found');
    
    const benefits = TIER_BENEFITS[customer.tier];
    const maxDiscount = billAmount * benefits.discountLimit;
    
    // Calculate how many points can be used
    const maxPointsForDiscount = Math.floor(maxDiscount / POINTS_VALUE);
    const availablePoints = customer.credit_points;
    const pointsUsed = Math.min(pointsToRedeem, availablePoints, maxPointsForDiscount);
    const discount = pointsUsed * POINTS_VALUE;
    
    // Update customer points
    await api.post(`/api/customers/${customerId}/loyalty`, {
      creditPoints: customer.credit_points - pointsUsed,
      totalPurchases: customer.total_purchases,
      tier: customer.tier,
      pointsRedeemed: (customer.points_redeemed || 0) + pointsUsed,
    });
    
    return { discount, pointsUsed };
  },

  // Generate unique invoice number
  async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    // Use timestamp-based sequence to avoid collisions without DB query
    const sequenceNum = Date.now().toString().slice(-4);
    return `INV-${dateStr}-${sequenceNum}`;
  },

  // Save transaction
  async saveTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const data = await api.post<any>(`/api/transactions`, {
      invoiceNumber: transaction.invoice_number,
      customerId: transaction.customer_id,
      items: transaction.items,
      subtotal: transaction.subtotal,
      gstAmount: transaction.gst_amount,
      discount: transaction.discount,
      totalAmount: transaction.total_amount,
      paymentMethod: transaction.payment_method,
      paymentStatus: transaction.payment_status,
      creditPointsEarned: transaction.credit_points_earned || 0,
    });

    return {
      id: data._id || data.id,
      invoice_number: data.invoiceNumber,
      items: data.items as any[],
      subtotal: Number(data.subtotal),
      gst_amount: Number(data.gstAmount),
      discount: Number(data.discount),
      total_amount: Number(data.totalAmount),
      payment_method: data.paymentMethod,
      payment_status: data.paymentStatus,
      credit_points_earned: data.creditPointsEarned || 0,
      customer_id: data.customer || null,
      created_at: data.createdAt || data.created_at,
    } as Transaction;
  },

  // Get transaction by invoice number
  async getTransactionByInvoice(invoiceNumber: string): Promise<Transaction | null> {
    const data = await api.get<any[]>(`/api/transactions`);
    const tx = (data || []).find(t => t.invoiceNumber === invoiceNumber);
    if (!tx) return null;
    return {
      id: tx._id || tx.id,
      invoice_number: tx.invoiceNumber,
      items: tx.items as any[],
      subtotal: Number(tx.subtotal),
      gst_amount: Number(tx.gstAmount),
      discount: Number(tx.discount),
      total_amount: Number(tx.totalAmount),
      payment_method: tx.paymentMethod,
      payment_status: tx.paymentStatus,
      customer_id: tx.customer || null,
      credit_points_earned: tx.creditPointsEarned || 0,
      created_at: tx.createdAt || tx.created_at,
    } as Transaction;
  },

  // Get customer transactions
  async getCustomerTransactions(customerId: string): Promise<Transaction[]> {
    const data = await api.get<any[]>(`/api/transactions`);

    return (data || [])
      .map(t => {
        const customerField = t.customer || t.customer_id;
        const customerIdFromTx = typeof customerField === 'string' ? customerField : customerField?._id;

        return {
          id: t._id || t.id,
          invoice_number: t.invoiceNumber,
          items: t.items as any[],
          subtotal: Number(t.subtotal),
          gst_amount: Number(t.gstAmount),
          discount: Number(t.discount),
          total_amount: Number(t.totalAmount),
          payment_method: t.paymentMethod,
          payment_status: t.paymentStatus,
          customer_id: customerIdFromTx || null,
          credit_points_earned: t.creditPointsEarned || 0,
          created_at: t.createdAt || t.created_at,
        } as Transaction;
      })
      .filter(t => t.customer_id === customerId);
  },

  // Get all customers with their tiers
  async getAllCustomers(): Promise<Customer[]> {
    const data = await api.get<any[]>(`/api/customers/search?q=`);
    return (data || []).map(mapCustomerRecord);
  },

  // Calculate credit points for amount
  calculateCreditPoints(amount: number, tier: 'Bronze' | 'Silver' | 'Gold' = 'Bronze'): number {
    const benefits = TIER_BENEFITS[tier];
    const basePoints = Math.floor(amount / CREDIT_POINTS_RATE);
    return Math.floor(basePoints * benefits.pointsMultiplier);
  },

  // Get tier thresholds
  getTierThresholds() {
    return TIER_THRESHOLDS;
  },

  // Calculate points value in rupees
  calculatePointsValue(points: number): number {
    return points * POINTS_VALUE;
  },
};
