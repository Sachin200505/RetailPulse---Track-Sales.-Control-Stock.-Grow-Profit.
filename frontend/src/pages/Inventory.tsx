import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, XCircle, Clock, DollarSign, Layers, TrendingDown, CalendarX } from 'lucide-react';
import { inventoryService, InventorySummary, StockItem } from '@/services/inventoryService';
import { supabase } from '@/integrations/supabase/client';

const isExpired = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

const isExpiringSoon = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
};

interface ExtendedStockItem extends StockItem {
  expiryDate?: string | null;
}

const Inventory: React.FC = () => {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [inventory, setInventory] = useState<ExtendedStockItem[]>([]);
  const [expiredCount, setExpiredCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'dead' | 'expired'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryData, inventoryData] = await Promise.all([
        inventoryService.getSummary(),
        inventoryService.getAll(),
      ]);
      
      // Fetch expiry dates for all products
      const { data: products } = await supabase
        .from('products')
        .select('id, expiry_date')
        .eq('is_active', true);
      
      const expiryMap: Record<string, string | null> = {};
      (products || []).forEach(p => {
        expiryMap[p.id] = p.expiry_date;
      });
      
      const enrichedInventory = inventoryData.map(item => ({
        ...item,
        expiryDate: expiryMap[item.id] || null,
      }));
      
      const expired = enrichedInventory.filter(item => isExpired(item.expiryDate)).length;
      setExpiredCount(expired);
      
      setSummary(summaryData);
      setInventory(enrichedInventory);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'low') return item.status === 'low';
    if (filter === 'out') return item.status === 'out';
    if (filter === 'dead') return item.status === 'dead';
    if (filter === 'expired') return isExpired(item.expiryDate);
    return true;
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="badge-success">Healthy</span>;
      case 'low':
        return <span className="badge-warning">Low Stock</span>;
      case 'out':
        return <span className="badge-danger">Out of Stock</span>;
      case 'dead':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            Dead Stock
          </span>
        );
      default:
        return null;
    }
  };

  const getExpiryBadge = (expiryDate?: string | null) => {
    if (!expiryDate) return null;
    if (isExpired(expiryDate)) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-danger/20 text-danger">
          <CalendarX className="w-3 h-3" /> Expired
        </span>
      );
    }
    if (isExpiringSoon(expiryDate)) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-warning/20 text-warning">
          <Clock className="w-3 h-3" /> Expiring Soon
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Inventory Overview</h2>
        <p className="text-sm text-muted-foreground">Stock levels and inventory health</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="stat-card col-span-2 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Total Value</p>
              <p className="stat-card-value mt-1 text-base md:text-xl">{formatCurrency(summary?.totalStockValue || 0)}</p>
            </div>
            <div className="stat-card-icon bg-primary/10 hidden sm:flex">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Products</p>
              <p className="stat-card-value mt-1">{summary?.totalProducts || 0}</p>
            </div>
            <div className="stat-card-icon bg-info/10 hidden sm:flex">
              <Layers className="w-5 h-5 text-info" />
            </div>
          </div>
        </div>

        <div 
          className="stat-card cursor-pointer hover:ring-2 hover:ring-warning/30 transition-all"
          onClick={() => setFilter('low')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Low Stock</p>
              <p className="stat-card-value mt-1 text-warning">{summary?.lowStockProducts || 0}</p>
            </div>
            <div className="stat-card-icon bg-warning/10 hidden sm:flex">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
          </div>
        </div>

        <div 
          className="stat-card cursor-pointer hover:ring-2 hover:ring-danger/30 transition-all"
          onClick={() => setFilter('out')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Out of Stock</p>
              <p className="stat-card-value mt-1 text-danger">{summary?.outOfStockProducts || 0}</p>
            </div>
            <div className="stat-card-icon bg-danger/10 hidden sm:flex">
              <XCircle className="w-5 h-5 text-danger" />
            </div>
          </div>
        </div>

        <div 
          className="stat-card cursor-pointer hover:ring-2 hover:ring-muted-foreground/30 transition-all col-span-2 sm:col-span-1"
          onClick={() => setFilter('dead')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-label">Dead Stock</p>
              <p className="stat-card-value mt-1 text-muted-foreground">{summary?.deadStockProducts || 0}</p>
            </div>
            <div className="stat-card-icon bg-muted hidden sm:flex">
              <TrendingDown className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Expired Alert Banner */}
      {expiredCount > 0 && (
        <div className="dashboard-card border-danger/30 bg-danger/5 p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-danger/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarX className="w-4 h-4 text-danger" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-danger text-sm">{expiredCount} Expired Product(s)</p>
              <p className="text-xs text-muted-foreground">Remove expired items from inventory immediately</p>
            </div>
            <button
              onClick={() => setFilter('expired')}
              className="px-3 py-1 text-xs font-medium bg-danger text-white rounded-md hover:bg-danger/90"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-full overflow-x-auto">
        {[
          { key: 'all', label: 'All' },
          { key: 'low', label: 'Low' },
          { key: 'out', label: 'Out' },
          { key: 'dead', label: 'Dead' },
          { key: 'expired', label: `Expired${expiredCount > 0 ? ` (${expiredCount})` : ''}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === key
                ? key === 'expired' && expiredCount > 0 ? 'bg-danger text-white shadow-sm' : 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Inventory Table - Desktop */}
      <div className="dashboard-card overflow-hidden p-0 hidden md:block">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock Qty</th>
                <th>Stock Value</th>
                <th>Last Sold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => (
                <tr key={item.id} className={isExpired(item.expiryDate) ? 'bg-danger/5' : ''}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isExpired(item.expiryDate) ? 'bg-danger/10' : 'bg-primary/10'}`}>
                        <Package className={`w-5 h-5 ${isExpired(item.expiryDate) ? 'text-danger' : 'text-primary'}`} />
                      </div>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {getExpiryBadge(item.expiryDate)}
                      </div>
                    </div>
                  </td>
                  <td>{item.category}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {item.status === 'low' && <AlertTriangle className="w-4 h-4 text-warning" />}
                      {item.status === 'out' && <XCircle className="w-4 h-4 text-danger" />}
                      {item.stock}
                    </div>
                  </td>
                  <td>{formatCurrency(item.stockValue)}</td>
                  <td>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {item.lastSold || 'Never'}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No items found for this filter
          </div>
        )}
      </div>

      {/* Inventory Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredInventory.length === 0 ? (
          <div className="dashboard-card text-center py-8 text-muted-foreground">
            No items found for this filter
          </div>
        ) : (
          filteredInventory.map(item => (
            <div key={item.id} className={`dashboard-card p-3 ${isExpired(item.expiryDate) ? 'border-danger/30 bg-danger/5' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpired(item.expiryDate) ? 'bg-danger/10' : 'bg-primary/10'}`}>
                    <Package className={`w-5 h-5 ${isExpired(item.expiryDate) ? 'text-danger' : 'text-primary'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{item.name}</p>
                      {getExpiryBadge(item.expiryDate)}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.status === 'low' && <AlertTriangle className="w-3 h-3 text-warning" />}
                      {item.status === 'out' && <XCircle className="w-3 h-3 text-danger" />}
                      <span className="text-sm font-medium">{item.stock} in stock</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {getStatusBadge(item.status)}
                  <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(item.stockValue)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dead Stock Alert */}
      {(summary?.deadStockProducts || 0) > 0 && filter === 'all' && (
        <div className="dashboard-card border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Dead Stock Alert</h4>
              <p className="text-sm text-muted-foreground mt-1">
                You have {summary?.deadStockProducts} product(s) that haven't been sold in over 30 days. 
                Consider running promotions or adjusting prices to move this inventory.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;