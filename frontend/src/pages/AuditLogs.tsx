import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { 
  History, 
  Search, 
  Filter, 
  Download,
  User,
  Calendar,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  CreditCard,
  Package,
  UserPlus,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: unknown;
  new_values: unknown;
  notes: string | null;
  created_at: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { isOwner } = useAuth();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get<AuditLog[]>(`/api/admin/audit-logs`);

      const filtered = (data || []).filter(log => {
        const created = new Date(log.created_at).getTime();
        const fromOk = dateFrom ? created >= new Date(`${dateFrom}T00:00:00`).getTime() : true;
        const toOk = dateTo ? created <= new Date(`${dateTo}T23:59:59`).getTime() : true;
        const actionOk = actionFilter === 'all' || log.action_type === actionFilter;
        return fromOk && toOk && actionOk;
      });

      setLogs(filtered);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, dateFrom, dateTo]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(search) ||
      log.action_type.toLowerCase().includes(search) ||
      log.entity_type?.toLowerCase().includes(search) ||
      log.notes?.toLowerCase().includes(search)
    );
  });

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      login: 'bg-info/10 text-info',
      logout: 'bg-muted text-muted-foreground',
      create: 'bg-success/10 text-success',
      update: 'bg-warning/10 text-warning',
      delete: 'bg-danger/10 text-danger',
      refund: 'bg-danger/10 text-danger',
      billing: 'bg-primary/10 text-primary',
      stock_update: 'bg-accent text-accent-foreground',
    };
    return colors[action] || 'bg-muted text-muted-foreground';
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, React.ReactNode> = {
      login: <LogIn className="w-4 h-4" />,
      logout: <LogOut className="w-4 h-4" />,
      create: <UserPlus className="w-4 h-4" />,
      update: <Edit className="w-4 h-4" />,
      delete: <Trash2 className="w-4 h-4" />,
      refund: <RotateCcw className="w-4 h-4" />,
      billing: <CreditCard className="w-4 h-4" />,
      stock_update: <Package className="w-4 h-4" />,
    };
    return icons[action] || <FileText className="w-4 h-4" />;
  };

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (key.includes('amount') || key.includes('price') || key.includes('total')) {
        return `₹${value.toLocaleString()}`;
      }
      return value.toLocaleString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return `${value.length} items`;
    return String(value);
  };

  const renderFriendlyDetails = (values: unknown, type: 'old' | 'new') => {
    if (!values || typeof values !== 'object') return null;
    
    const obj = values as Record<string, unknown>;
    const entries = Object.entries(obj);
    
    if (entries.length === 0) return null;

    const labelMap: Record<string, string> = {
      items_count: 'Items Count',
      total_amount: 'Total Amount',
      payment_method: 'Payment Method',
      customer_name: 'Customer',
      invoice_number: 'Invoice',
      product_name: 'Product',
      quantity: 'Quantity',
      stock: 'Stock Level',
      selling_price: 'Selling Price',
      cost_price: 'Cost Price',
      category: 'Category',
      name: 'Name',
      email: 'Email',
      mobile: 'Mobile',
      tier: 'Tier',
      credit_points: 'Credit Points',
      role: 'Role',
      is_active: 'Active Status',
    };

    return (
      <div className={`p-3 rounded-lg ${type === 'old' ? 'bg-danger/5 border border-danger/20' : 'bg-success/5 border border-success/20'}`}>
        <p className={`text-xs font-medium mb-2 ${type === 'old' ? 'text-danger' : 'text-success'}`}>
          {type === 'old' ? 'Previous Values' : 'New Values'}
        </p>
        <div className="space-y-1.5">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground capitalize">
                {labelMap[key] || key.replace(/_/g, ' ')}
              </span>
              <span className="font-medium text-foreground">
                {formatValue(key, value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const downloadCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const headers = ['Date/Time', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Notes'];
    const csvRows = [headers.join(',')];

    filteredLogs.forEach(log => {
      const row = [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        `"${log.user_name || 'System'}"`,
        log.user_role || '-',
        log.action_type,
        log.entity_type || '-',
        log.entity_id || '-',
        `"${(log.notes || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredLogs.length} log entries`);
  };

  const actionTypes = ['all', 'login', 'logout', 'create', 'update', 'delete', 'billing', 'refund', 'stock_update'];

  const resetLogs = async () => {
    setResetting(true);
    try {
      await api.del<{ message: string; deleted: number }>(`/api/admin/audit-logs`);
      toast.success('Audit logs cleared');
      await fetchLogs();
    } catch (error) {
      console.error('Error clearing audit logs:', error);
      toast.error('Failed to clear audit logs');
    } finally {
      setResetting(false);
      setResetDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Audit Logs
          </h1>
          <p className="page-subtitle">Track all system activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={downloadCSV} className="btn-gradient">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'All Actions' : type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
              placeholder="To"
            />
            {isOwner && (
              <div className="flex justify-end">
                <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 border-destructive text-destructive hover:bg-destructive/10"
                      disabled={loading || resetting}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Logs
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear audit logs?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to clear all these logs? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={resetLogs}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={resetting}
                      >
                        {resetting ? 'Clearing…' : 'Yes, clear logs'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Activity Log
            </span>
            <Badge variant="secondary" className="text-xs">
              {filteredLogs.length} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No audit logs found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div 
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActionBadgeColor(log.action_type)}`}>
                          {getActionIcon(log.action_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {log.user_name || 'System'}
                            </span>
                            {log.user_role && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {log.user_role}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`text-xs capitalize ${getActionBadgeColor(log.action_type)}`}>
                              {log.action_type.replace('_', ' ')}
                            </Badge>
                            {log.entity_type && (
                              <span className="text-xs text-muted-foreground">
                                on {log.entity_type}
                              </span>
                            )}
                          </div>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(log.created_at), 'MMM d, HH:mm')}
                          </div>
                        </div>
                        {(log.old_values || log.new_values) && (
                          expandedLog === log.id ? 
                            <ChevronUp className="w-4 h-4 text-muted-foreground" /> : 
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details - User Friendly */}
                    {expandedLog === log.id && (log.old_values || log.new_values) && (
                      <div className="mt-3 pl-11 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {log.old_values && renderFriendlyDetails(log.old_values, 'old')}
                        {log.new_values && renderFriendlyDetails(log.new_values, 'new')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
