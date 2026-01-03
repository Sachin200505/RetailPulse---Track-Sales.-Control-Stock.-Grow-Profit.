import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Bell,
  Package,
  AlertTriangle,
  Check,
  Clock,
  RefreshCw,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface StockAlert {
  id: string;
  product_id: string;
  alert_type: string;
  stock_level: number;
  threshold: number;
  sms_sent: boolean;
  sms_sent_at: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  product?: {
    name: string;
    sku: string;
    category: string;
  };
}

const StockAlerts: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'acknowledged'>('all');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.get<StockAlert[]>('/api/stock-alerts');
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      await api.post(`/api/stock-alerts/${alertId}/acknowledge`, {
        acknowledged_by: user?.id,
      });
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'pending') return !alert.acknowledged;
    if (filter === 'acknowledged') return alert.acknowledged;
    return true;
  });

  const pendingCount = alerts.filter(a => !a.acknowledged).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-warning" />
            Stock Alerts
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-danger text-danger-foreground text-sm rounded-full">
                {pendingCount}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">Monitor low stock items and SMS notifications</p>
        </div>
        <button
          onClick={fetchAlerts}
          className="btn-secondary"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label">Total Alerts</p>
              <p className="stat-card-value">{alerts.length}</p>
            </div>
            <div className="stat-card-icon bg-muted">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label">Pending</p>
              <p className="stat-card-value text-warning">{pendingCount}</p>
            </div>
            <div className="stat-card-icon bg-warning/10">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label">Acknowledged</p>
              <p className="stat-card-value text-success">{alerts.length - pendingCount}</p>
            </div>
            <div className="stat-card-icon bg-success/10">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending' 
              ? 'bg-warning text-warning-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('acknowledged')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'acknowledged' 
              ? 'bg-success text-success-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Acknowledged ({alerts.length - pendingCount})
        </button>
      </div>

      {/* Alerts List */}
      <div className="dashboard-card">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No stock alerts found</p>
            <p className="text-sm mt-1">All products are well stocked!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map(alert => (
              <div 
                key={alert.id}
                className={`border rounded-lg p-4 ${
                  alert.acknowledged 
                    ? 'border-border bg-card' 
                    : 'border-warning/50 bg-warning/5'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.acknowledged ? 'bg-muted' : 'bg-warning/20'
                    }`}>
                      <Package className={`w-5 h-5 ${alert.acknowledged ? 'text-muted-foreground' : 'text-warning'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {alert.product?.name || 'Unknown Product'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {alert.product?.sku} • Category: {alert.product?.category}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-danger font-medium">
                          {alert.alert_type === 'expiry'
                            ? 'Expiry alert'
                            : `Stock: ${alert.stock_level} (Threshold: ${alert.threshold})`}
                        </span>
                        {alert.sms_sent && (
                          <span className="text-success flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            SMS Sent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(alert.created_at)}
                    </div>
                    
                    {!alert.acknowledged && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          disabled={actionLoading === alert.id}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          {actionLoading === alert.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              Acknowledge
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {alert.acknowledged && (
                      <span className="badge-success text-xs">
                        <Check className="w-3 h-3" />
                        Acknowledged {alert.acknowledged_at && `at ${formatDate(alert.acknowledged_at)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAlerts;
