import React, { useState, useEffect } from 'react';
import { Search, Phone, Gift, TrendingUp, History, ChevronDown, ChevronUp } from 'lucide-react';
import { customerService, Customer, Transaction } from '@/services/customerService';
import { LoyaltyTierBadge, TierProgress } from '@/components/LoyaltyTierBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<'all' | 'Bronze' | 'Silver' | 'Gold'>('all');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Record<string, Transaction[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, selectedTier]);

  const fetchCustomers = async () => {
    try {
      const data = await customerService.getAllCustomers();
      setCustomers(data);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.mobile.includes(query)
      );
    }

    if (selectedTier !== 'all') {
      filtered = filtered.filter(c => c.tier === selectedTier);
    }

    setFilteredCustomers(filtered);
  };

  const toggleCustomerHistory = async (customerId: string) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
      return;
    }

    setExpandedCustomer(customerId);

    if (!customerTransactions[customerId]) {
      setLoadingTransactions(customerId);
      try {
        const transactions = await customerService.getCustomerTransactions(customerId);
        setCustomerTransactions(prev => ({
          ...prev,
          [customerId]: transactions,
        }));
      } catch (error) {
        toast.error('Failed to load purchase history');
      } finally {
        setLoadingTransactions(null);
      }
    }
  };

  const tierCounts = {
    all: customers.length,
    Bronze: customers.filter(c => c.tier === 'Bronze').length,
    Silver: customers.filter(c => c.tier === 'Silver').length,
    Gold: customers.filter(c => c.tier === 'Gold').length,
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Customers</h2>
        <p className="text-sm text-muted-foreground">{customers.length} loyalty members</p>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="dashboard-card p-2 text-center">
          <p className="text-lg font-bold text-foreground">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="dashboard-card p-2 text-center">
          <p className="text-lg font-bold text-amber-600">{tierCounts.Gold}</p>
          <p className="text-xs text-muted-foreground">Gold</p>
        </div>
        <div className="dashboard-card p-2 text-center">
          <p className="text-lg font-bold text-slate-500">{tierCounts.Silver}</p>
          <p className="text-xs text-muted-foreground">Silver</p>
        </div>
        <div className="dashboard-card p-2 text-center">
          <p className="text-lg font-bold text-orange-600">{tierCounts.Bronze}</p>
          <p className="text-xs text-muted-foreground">Bronze</p>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-card p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or mobile..."
              className="form-input pl-10 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['all', 'Gold', 'Silver', 'Bronze'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedTier === tier
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tier === 'all' ? 'All' : tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Customer List */}
      <div className="dashboard-card overflow-hidden p-0">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No customers found
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[calc(100vh-320px)] overflow-y-auto">
            {filteredCustomers.map(customer => (
              <div key={customer.id} className="hover:bg-muted/30 transition-colors">
                {/* Compact Customer Row */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => toggleCustomerHistory(customer.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{customer.name}</span>
                          <LoyaltyTierBadge tier={customer.tier} size="sm" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{customer.mobile}</span>
                          <span>•</span>
                          <Gift className="w-3 h-3" />
                          <span>{customer.credit_points} pts</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-primary">{formatCurrency(Number(customer.total_purchases))}</p>
                        <p className="text-xs text-muted-foreground">total spent</p>
                      </div>
                      <div className="p-1 rounded-full bg-muted">
                        {expandedCustomer === customer.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase History - Collapsed */}
                {expandedCustomer === customer.id && (
                  <div className="border-t border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Purchase History
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Redeemed: {customer.points_redeemed} pts
                      </span>
                    </div>

                    {loadingTransactions === customer.id ? (
                      <div className="text-center py-3 text-xs text-muted-foreground">
                        Loading...
                      </div>
                    ) : customerTransactions[customer.id]?.length === 0 ? (
                      <div className="text-center py-3 text-xs text-muted-foreground">
                        No purchases yet
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-auto">
                        {customerTransactions[customer.id]?.slice(0, 5).map(transaction => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-2 bg-card rounded border border-border text-xs"
                          >
                            <div>
                              <span className="font-medium">{transaction.invoice_number}</span>
                              <span className="text-muted-foreground ml-2">
                                {format(new Date(transaction.created_at), 'MMM d')}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold">{formatCurrency(Number(transaction.total_amount))}</span>
                              {transaction.credit_points_earned > 0 && (
                                <span className="text-success ml-1">+{transaction.credit_points_earned}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {customerTransactions[customer.id]?.length > 5 && (
                          <p className="text-xs text-center text-muted-foreground pt-1">
                            +{customerTransactions[customer.id].length - 5} more transactions
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
