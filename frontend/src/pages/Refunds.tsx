import React, { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, AlertCircle, CheckCircle, Package, User, Calendar, Receipt, ArrowLeft } from 'lucide-react';
import { billingService, Bill } from '@/services/billingService';
import { refundService, Refund } from '@/services/refundService';
import { customerService, Customer } from '@/services/customerService';
import { toast } from 'sonner';

const Refunds: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceSuggestions, setInvoiceSuggestions] = useState<Bill[]>([]);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [focusedInvoiceIndex, setFocusedInvoiceIndex] = useState(-1);
  const [transaction, setTransaction] = useState<Bill | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recentRefunds, setRecentRefunds] = useState<Refund[]>([]);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    fetchRecentRefunds();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter invoice number');
      return;
    }

    setLoading(true);
    setSearchError('');
    setTransaction(null);
    setCustomer(null);

    try {
      const tx = await billingService.getTransactionByInvoice(searchQuery.trim());
      
      if (!tx) {
        setSearchError('Transaction not found');
        return;
      }

      // Check if can refund
      const canRefundCheck = await refundService.canRefund(tx.id);
      if (!canRefundCheck.canRefund) {
        setSearchError(canRefundCheck.reason || 'Cannot refund');
        setTransaction(tx);
        return;
      }

      setTransaction(tx);

      // Fetch customer if exists
      if (tx.customer_id) {
        const cust = await customerService.getById(tx.customer_id);
        setCustomer(cust);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Invoice search autocomplete
  useEffect(() => {
    const searchInvoices = async () => {
      const query = searchQuery.trim();
      if (query.length < 1) {
        setInvoiceSuggestions([]);
        setShowInvoiceDropdown(false);
        return;
      }

      try {
        const all = await billingService.getAllTransactions();
        const filtered = all
          .filter(t => t.invoice_number.toLowerCase().includes(query.toLowerCase()))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setInvoiceSuggestions(filtered);
        setShowInvoiceDropdown(filtered.length > 0);
        setFocusedInvoiceIndex(-1);
      } catch (error) {
        console.error('Error searching invoices:', error);
      }
    };

    const debounce = setTimeout(searchInvoices, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const fetchRecentRefunds = async () => {
    try {
      const refunds = await refundService.getAllRefunds();
      setRecentRefunds(refunds.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch refunds:', error);
    }
  };

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showInvoiceDropdown && invoiceSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          setFocusedInvoiceIndex(prev => 
            prev < invoiceSuggestions.length - 1 ? prev + 1 : prev
          );
          return;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          setFocusedInvoiceIndex(prev => prev > 0 ? prev - 1 : 0);
          return;
        case 'Enter':
          e.preventDefault();
          if (focusedInvoiceIndex >= 0 && focusedInvoiceIndex < invoiceSuggestions.length) {
            selectInvoice(invoiceSuggestions[focusedInvoiceIndex]);
          } else if (invoiceSuggestions.length > 0) {
            selectInvoice(invoiceSuggestions[0]);
          }
          return;
        case 'Escape':
          setShowInvoiceDropdown(false);
          setFocusedInvoiceIndex(-1);
          return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowInvoiceDropdown(false);
      setFocusedInvoiceIndex(-1);
    }
  }, [showInvoiceDropdown, invoiceSuggestions, focusedInvoiceIndex, handleSearch]);

  const selectInvoice = async (bill: Bill) => {
    setSearchQuery(bill.invoice_number);
    setShowInvoiceDropdown(false);
    setInvoiceSuggestions([]);
    setTransaction(bill);
    setSearchError('');

    // Check if can refund
    const canRefundCheck = await refundService.canRefund(bill.id);
    if (!canRefundCheck.canRefund) {
      setSearchError(canRefundCheck.reason || 'Cannot refund');
    }

    // Fetch customer if exists
    if (bill.customer_id) {
      const cust = await customerService.getById(bill.customer_id);
      setCustomer(cust);
    }
  };

  const handleRefund = async () => {
    if (!transaction) return;
    
    if (!refundReason.trim()) {
      toast.error('Enter refund reason');
      return;
    }

    setProcessing(true);

    try {
      const result = await refundService.processRefund({
        transactionId: transaction.id,
        reason: refundReason.trim()
      });

      if (result.success) {
        toast.success('Refund processed successfully');
        setTransaction(null);
        setCustomer(null);
        setRefundReason('');
        setSearchQuery('');
        fetchRecentRefunds();
      } else {
        toast.error(result.error || 'Refund failed');
      }
    } catch (error) {
      console.error('Refund failed:', error);
      toast.error('Refund failed');
    } finally {
      setProcessing(false);
    }
  };

  const clearSearch = () => {
    setTransaction(null);
    setCustomer(null);
    setSearchQuery('');
    setRefundReason('');
    setSearchError('');
    setShowInvoiceDropdown(false);
    setInvoiceSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Refunds</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Search & Process Refund */}
        <div className="dashboard-card">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Process Refund</h3>
          
          {!transaction ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Type invoice number (e.g., INV-2024...)"
                    className="form-input pl-10 text-sm"
                  />
                  
                  {/* Invoice Suggestions Dropdown */}
                  {showInvoiceDropdown && invoiceSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden max-h-[28rem] overflow-y-auto" role="listbox" aria-label="Invoice suggestions">
                      {invoiceSuggestions.map((invoice, index) => (
                        <button
                          key={invoice.id}
                          onClick={() => selectInvoice(invoice)}
                          role="option"
                          aria-selected={focusedInvoiceIndex === index}
                          className={`w-full flex items-center justify-between p-2 hover:bg-muted text-left text-sm transition-colors ${
                            focusedInvoiceIndex === index ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div>
                            <p className="font-medium text-foreground">{invoice.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(invoice.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-semibold text-primary">
                            ₹{invoice.total_amount.toLocaleString()}
                          </span>
                        </button>
                      ))}
                      <div className="px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
                        Use ↑↓ to navigate, Enter to select
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="btn-primary text-sm"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searchError && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 rounded-lg text-danger text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={clearSearch}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Search
              </button>

              {/* Transaction Details */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{transaction.invoice_number}</span>
                  {transaction.is_refunded ? (
                    <span className="px-2 py-0.5 bg-danger/10 text-danger rounded-full text-xs">Refunded</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-xs">Active</span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-right font-semibold text-primary">
                    ₹{transaction.total_amount.toLocaleString()}
                  </div>
                </div>

                {customer && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{customer.name}</span>
                    <span className="font-mono">{customer.customer_code}</span>
                  </div>
                )}

                {/* Items */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Items:</p>
                  <div className="space-y-1">
                    {(transaction.items as any[]).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{item.productName} × {item.quantity}</span>
                        <span>₹{item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {!transaction.is_refunded && (
                <>
                  {/* Refund Reason */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Refund Reason *</label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Enter reason for refund..."
                      className="form-input text-sm resize-none h-20"
                    />
                  </div>

                  {/* Refund Summary */}
                  <div className="p-3 bg-warning/10 rounded-lg text-xs">
                    <p className="font-medium text-warning mb-1">This will:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Reverse stock for all items</li>
                      <li>• Reverse loyalty points earned</li>
                      <li>• Mark transaction as refunded</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleRefund}
                    disabled={processing || !refundReason.trim()}
                    className="btn-danger w-full text-sm"
                  >
                    {processing ? 'Processing...' : `Process Refund - ₹${transaction.total_amount.toLocaleString()}`}
                  </button>
                </>
              )}

              {searchError && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 rounded-lg text-danger text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Refunds */}
        <div className="dashboard-card">
          <h3 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Recent Refunds
          </h3>

          {recentRefunds.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No refunds yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {recentRefunds.map(refund => (
                <div key={refund.id} className="p-2 bg-muted rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-muted-foreground">
                      {refund.transaction_id.slice(0, 8)}...
                    </span>
                    <span className="font-semibold text-danger">
                      -₹{refund.refund_amount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate">{refund.refund_reason}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>{new Date(refund.created_at).toLocaleString()}</span>
                    {refund.points_reversed > 0 && (
                      <span className="text-warning">-{refund.points_reversed} pts</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Refunds;
