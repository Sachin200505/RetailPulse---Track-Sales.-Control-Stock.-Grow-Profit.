import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Calendar, Filter, Receipt, Printer, Eye, X, Download, ChevronLeft, ChevronRight, FileDown, Trash2 } from 'lucide-react';
import { billingService, Bill } from '@/services/billingService';
import { customerService } from '@/services/customerService';
import BillReceipt from '@/components/BillReceipt';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface TransactionWithCustomer extends Bill {
  customer_name?: string;
  customer_mobile?: string;
  customer_code?: string;
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionWithCustomer[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'card'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCustomer | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingSelection, setDeletingSelection] = useState(false);
  const { isOwner } = useAuth();
  
  // Custom date range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const tableRef = useRef<HTMLTableElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, dateFilter, paymentFilter, startDate, endDate]);

  // Drop selections that are no longer visible
  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => filteredTransactions.some(t => t.id === id)));
  }, [filteredTransactions]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }

    if (document.activeElement === searchRef.current) {
      if (e.key === 'Escape') {
        searchRef.current?.blur();
        setFocusedIndex(0);
      }
      return;
    }

    const pageTransactions = paginatedTransactions;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, pageTransactions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < pageTransactions.length) {
          handleViewReceipt(pageTransactions[focusedIndex]);
        }
        break;
      case 'p':
      case 'P':
        if (focusedIndex >= 0 && focusedIndex < pageTransactions.length) {
          handleViewReceipt(pageTransactions[focusedIndex]);
        }
        break;
    }
  }, [focusedIndex, filteredTransactions, currentPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const fetchTransactions = async () => {
    try {
      const data = await billingService.getAllTransactions();
      const mapped: TransactionWithCustomer[] = (data || []).map(t => ({
        ...t,
        customer_name: t.customer_name,
        customer_mobile: t.customer_mobile,
      }));
      // Newest first
      mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(mapped);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.invoice_number.toLowerCase().includes(query) ||
        t.customer_name?.toLowerCase().includes(query) ||
        t.customer_mobile?.includes(query)
      );
    }

    // Date filter
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (dateFilter === 'today') {
      filtered = filtered.filter(t => new Date(t.created_at) >= startOfToday);
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(t => new Date(t.created_at) >= startOfWeek);
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(t => new Date(t.created_at) >= startOfMonth);
    } else if (dateFilter === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const date = new Date(t.created_at);
        return date >= start && date <= end;
      });
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(t => t.payment_method === paymentFilter);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
    setFocusedIndex(-1);
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Invoice Number', 'Date', 'Customer Name', 'Customer Mobile', 'Payment Method', 'Subtotal', 'GST', 'Discount', 'Total Amount', 'Status'];
    
    const rows = filteredTransactions.map(t => [
      t.invoice_number,
      new Date(t.created_at).toLocaleString('en-IN'),
      t.customer_name || 'Walk-in',
      t.customer_mobile || '',
      t.payment_method.toUpperCase(),
      t.subtotal.toFixed(2),
      t.gst_amount.toFixed(2),
      t.discount.toFixed(2),
      t.total_amount.toFixed(2),
      t.is_refunded ? 'Refunded' : 'Completed'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const dateRange = dateFilter === 'custom' && startDate && endDate 
      ? `${startDate}_to_${endDate}`
      : dateFilter;
    link.download = `transactions_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredTransactions.length} transactions`);
  };

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const allVisibleSelected = paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.includes(t.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const remaining = selectedIds.filter(id => !paginatedTransactions.some(t => t.id === id));
      setSelectedIds(remaining);
    } else {
      const idsToAdd = paginatedTransactions.map(t => t.id);
      const merged = Array.from(new Set([...selectedIds, ...idsToAdd]));
      setSelectedIds(merged);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) {
      toast.error('Select at least one transaction');
      return;
    }
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected transaction(s)? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingSelection(true);
    try {
      const res = await billingService.deleteTransactionsByIds(selectedIds);
      toast.success(`Deleted ${res.deleted} transaction(s)`);
      await fetchTransactions();
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to delete selected transactions', error);
      toast.error('Failed to delete selected transactions');
    } finally {
      setDeletingSelection(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    const confirmed = window.confirm('Delete this transaction? This cannot be undone.');
    if (!confirmed) return;
    setDeletingSelection(true);
    try {
      const res = await billingService.deleteTransactionsByIds([id]);
      toast.success(`Deleted ${res.deleted} transaction(s)`);
      await fetchTransactions();
      setSelectedIds(prev => prev.filter(x => x !== id));
    } catch (error) {
      console.error('Failed to delete transaction', error);
      toast.error('Failed to delete transaction');
    } finally {
      setDeletingSelection(false);
    }
  };

  const handleViewReceipt = (transaction: TransactionWithCustomer) => {
    setSelectedTransaction(transaction);
    setShowReceipt(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentBadge = (method: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-success/10 text-success',
      upi: 'bg-primary/10 text-primary',
      card: 'bg-info/10 text-info',
    };
    return colors[method] || 'bg-muted text-muted-foreground';
  };

  // Calculate totals for filtered transactions
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Transaction History</h2>
          <p className="text-sm text-muted-foreground">
            {filteredTransactions.length} transactions • ₹{totalAmount.toLocaleString()} total • Press / to search
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="btn-primary flex items-center gap-2"
        >
          <FileDown className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="dashboard-card p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, customer..."
                className="form-input pl-10 text-sm"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="form-input text-sm w-full sm:w-auto"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="form-input text-sm w-full sm:w-auto"
              >
                <option value="all">All Payments</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>

              {isOwner && (
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    onClick={handleDeleteSelected}
                    disabled={deletingSelection || selectedIds.length === 0}
                    className="h-9 px-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="text-sm text-muted-foreground px-1">
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : 'No transactions selected'}
        </div>
      )}

      {/* Transactions Table - Desktop */}
      <div className="dashboard-card overflow-hidden p-0">
        <div className="hidden md:block overflow-x-auto">
          <table ref={tableRef} className="data-table">
            <thead>
              <tr>
                {isOwner && (
                  <th className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                )}
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((t, index) => (
                <tr 
                  key={t.id}
                  className={focusedIndex === index ? 'bg-primary/5' : ''}
                  tabIndex={0}
                >
                  {isOwner && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label="Select transaction"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleSelectOne(t.id)}
                      />
                    </td>
                  )}
                  <td>
                    <span className="font-mono text-sm">{t.invoice_number}</span>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium text-sm">{t.customer_name || 'Walk-in'}</p>
                      {t.customer_mobile && (
                        <p className="text-xs text-muted-foreground">{t.customer_mobile}</p>
                      )}
                    </div>
                  </td>
                  <td className="font-semibold">₹{t.total_amount.toLocaleString()}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPaymentBadge(t.payment_method)}`}>
                      {t.payment_method}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">{formatDate(t.created_at)}</td>
                  <td>
                    {t.is_refunded ? (
                      <span className="badge-danger">Refunded</span>
                    ) : (
                      <span className="badge-success">Completed</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteSingle(t.id)}
                          className="p-2 hover:bg-muted rounded-lg text-destructive hover:text-destructive"
                          title="Delete transaction"
                          disabled={deletingSelection}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewReceipt(t)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                        title="View Receipt (Enter)"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {paginatedTransactions.map((t, index) => (
            <div 
              key={t.id}
              className={`p-3 ${focusedIndex === index ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {isOwner && (
                    <div className="mb-2">
                      <input
                        type="checkbox"
                        aria-label="Select transaction"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleSelectOne(t.id)}
                        className="rounded border-border"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{t.invoice_number}</span>
                    {t.is_refunded ? (
                      <span className="badge-danger text-xs">Refunded</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPaymentBadge(t.payment_method)}`}>
                        {t.payment_method}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm mt-1">{t.customer_name || 'Walk-in'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{t.total_amount.toLocaleString()}</p>
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteSingle(t.id)}
                      className="mt-1 p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                      disabled={deletingSelection}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleViewReceipt(t)}
                    className="mt-1 p-1.5 bg-primary/10 text-primary rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {paginatedTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No transactions found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && selectedTransaction && (
        <BillReceipt
          invoice={{
            transactionId: selectedTransaction.id,
            invoiceNumber: selectedTransaction.invoice_number,
            items: (() => {
              const mapped = selectedTransaction.items.map((item: any) => {
                const productName = item.productName || item.product?.name || 'Item';
                const unitPrice = Number(item.unitPrice ?? item.product?.sellingPrice ?? (item.subtotal || 0) / (item.quantity || 1));
                const subtotal = Number(item.subtotal ?? 0);
                const gstAmountRaw = Number(item.gstAmount ?? item.gst_amount ?? 0);
                const fallbackRate = Number(item.gstRate ?? item.gst_rate ?? 0);
                const baseGstRate = subtotal > 0 ? (gstAmountRaw * 100) / subtotal : fallbackRate;
                return {
                  product: {
                    id: item.productId || item.product?.id,
                    name: productName,
                    sellingPrice: unitPrice,
                    sku: item.product?.sku || '',
                    category: item.product?.category || '',
                    costPrice: item.product?.costPrice || unitPrice,
                    stock: item.product?.stock || 0,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                  },
                  quantity: item.quantity,
                  subtotal,
                  gstAmount: gstAmountRaw,
                  gstRate: baseGstRate,
                  totalWithGst: subtotal + gstAmountRaw,
                };
              });

              const totalGst = Number(selectedTransaction.gst_amount ?? 0);
              const mappedSubtotal = mapped.reduce((sum, i) => sum + i.subtotal, 0);
              const allZeroGst = mapped.every(i => (i.gstAmount ?? 0) === 0);

              if (allZeroGst && totalGst > 0 && mappedSubtotal > 0) {
                return mapped.map(i => {
                  const allocatedGst = (i.subtotal / mappedSubtotal) * totalGst;
                  const gstRate = i.subtotal > 0 ? (allocatedGst * 100) / i.subtotal : 0;
                  return {
                    ...i,
                    gstAmount: allocatedGst,
                    gstRate,
                    totalWithGst: i.subtotal + allocatedGst,
                  };
                });
              }

              return mapped;
            })(),
            subtotal: selectedTransaction.subtotal,
            gstAmount: selectedTransaction.gst_amount,
            discount: selectedTransaction.discount,
            pointsRedeemed: 0,
            totalAmount: selectedTransaction.total_amount,
            paymentMethod: selectedTransaction.payment_method,
            creditPointsEarned: 0,
            customer: {
              customerCode: selectedTransaction.customer_code || '',
              totalCreditPoints: 0,
              mobile: selectedTransaction.customer_mobile || '',
            },
            createdAt: new Date(selectedTransaction.created_at),
          }}
          onClose={() => {
            setShowReceipt(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
};

export default TransactionHistory;