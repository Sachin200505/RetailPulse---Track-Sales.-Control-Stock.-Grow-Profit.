// Refund Service - Handle refunds with backend API (stock/points handled server-side)
import { api } from '@/lib/api';
import { billingService } from './billingService';

export interface Refund {
  id: string;
  transaction_id: string;
  refund_amount: number;
  refund_reason: string;
  points_reversed: number;
  stock_reversed: boolean;
  processed_by: string | null;
  created_at: string;
}

export interface RefundRequest {
  transactionId: string;
  reason: string;
  refundAmount?: number; // Optional - defaults to full refund
}

export const refundService = {
  // Process full refund
  async processRefund(request: RefundRequest): Promise<{ success: boolean; refund?: Refund; error?: string }> {
    try {
      // 1. Get the transaction to validate
      const transaction = await billingService.getTransactionById(request.transactionId);
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // 2. Check if already refunded
      if (transaction.is_refunded || transaction.isRefunded) {
        return { success: false, error: 'Transaction already refunded' };
      }

      const refundAmount = request.refundAmount || transaction.total_amount || transaction.totalAmount;

      // 3. Ask backend to process refund (handles stock + points)
      const data = await api.post<any>('/api/refunds', {
        transactionId: request.transactionId,
        refundAmount,
        reason: request.reason,
      });

      const refund = this.toRefund(data);

      // 4. Refresh transaction cache if needed (caller responsibility)
      return { success: true, refund };
    } catch (error: any) {
      console.error('Refund failed:', error);
      return { success: false, error: error.message || 'Refund failed' };
    }
  },

  // Get refund by transaction ID
  async getRefundByTransaction(transactionId: string): Promise<Refund | null> {
    const data = await api.get<any | null>(`/api/refunds/transaction/${transactionId}`);
    if (!data) return null;
    return this.toRefund(data);
  },

  // Get all refunds
  async getAllRefunds(): Promise<Refund[]> {
    const data = await api.get<any[]>(`/api/refunds`);
    return (data || []).map(this.toRefund).sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  },

  // Check if transaction can be refunded
  async canRefund(transactionId: string): Promise<{ canRefund: boolean; reason?: string }> {
    const transaction = await billingService.getTransactionById(transactionId);
    
    if (!transaction) {
      return { canRefund: false, reason: 'Transaction not found' };
    }
    
    if (transaction.is_refunded || transaction.isRefunded) {
      return { canRefund: false, reason: 'Already refunded' };
    }
    
    // Optional: Add time-based restriction (e.g., 30 days)
    const createdAt = new Date(transaction.created_at || transaction.createdAt);
    const daysSinceTransaction = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceTransaction > 30) {
      return { canRefund: false, reason: 'Refund period expired (30 days)' };
    }
    
    return { canRefund: true };
  },

  toRefund(raw: any): Refund {
    return {
      id: raw._id || raw.id,
      transaction_id: raw.transaction || raw.transaction_id,
      refund_amount: Number(raw.refundAmount ?? raw.refund_amount),
      refund_reason: raw.refundReason ?? raw.refund_reason,
      points_reversed: raw.pointsReversed ?? raw.points_reversed ?? 0,
      stock_reversed: raw.stockReversed ?? raw.stock_reversed ?? false,
      processed_by: raw.processedBy ?? raw.processed_by ?? null,
      created_at: raw.createdAt || raw.created_at,
    };
  },
};
