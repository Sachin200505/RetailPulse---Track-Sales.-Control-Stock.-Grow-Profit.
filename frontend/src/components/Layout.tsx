import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Receipt,
  BarChart3,
  Warehouse,
  Wallet,
  LogOut,
  Store,
  User,
  Menu,
  X,
  Users,
  Shield,
  FileText,
  Bell,
  RotateCcw,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { user, isOwner, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'cashier': return 'Cashier';
      default: return 'User';
    }
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'owner': return 'bg-amber-500/20 text-amber-600';
      case 'admin': return 'bg-primary/20 text-primary';
      case 'cashier': return 'bg-info/20 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const navItems = [
    { 
      to: '/dashboard', 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      roles: ['owner', 'admin'] 
    },
    { 
      to: '/products', 
      icon: Package, 
      label: 'Products', 
      roles: ['owner', 'admin'] 
    },
    { 
      to: '/billing', 
      icon: Receipt, 
      label: 'Billing', 
      roles: ['owner', 'admin', 'cashier'] 
    },
    { 
      to: '/transactions', 
      icon: FileText, 
      label: 'Transactions', 
      roles: ['owner', 'admin'] 
    },
    { 
      to: '/customers', 
      icon: User, 
      label: 'Customers', 
      roles: ['owner', 'admin'] 
    },
    { 
      to: '/expenses', 
      icon: Wallet, 
      label: 'Expenses', 
      roles: ['owner', 'admin'] 
    },
    { 
      to: '/analytics', 
      icon: BarChart3, 
      label: 'Analytics', 
      roles: ['owner', 'admin'] 
    },
    { 
      to: '/inventory', 
      icon: Warehouse, 
      label: 'Inventory', 
      roles: ['owner', 'admin'] 
    },
    { 
      to: '/stock-alerts', 
      icon: Bell, 
      label: 'Alerts', 
      roles: ['owner', 'admin'] 
    },
    { 
      to: '/refunds', 
      icon: RotateCcw, 
      label: 'Refunds', 
      roles: ['owner', 'admin', 'cashier'] 
    },
    { 
      to: '/users', 
      icon: Users, 
      label: 'Users', 
      roles: ['owner'] 
    },
    { 
      to: '/audit-logs', 
      icon: Shield, 
      label: 'Audit', 
      roles: ['owner', 'admin'] 
    },
  ];

  const filteredNavItems = navItems.filter(
    item => user && item.roles.includes(user.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/30 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">RetailPulse</span>
          </div>
          <button 
            onClick={onToggle}
            className="lg:hidden p-1 hover:bg-sidebar-accent rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <ul className="space-y-1">
            {filteredNavItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => window.innerWidth < 1024 && onToggle()}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info & Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center">
              {user?.role === 'owner' ? (
                <Shield className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>
                {getRoleLabel()}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-item w-full text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

interface HeaderProps {
  onMenuToggle: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, title }) => {
  const { user } = useAuth();

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'cashier': return 'Cashier';
      default: return 'User';
    }
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'owner': return 'bg-amber-500/10 text-amber-600';
      case 'admin': return 'bg-primary/10 text-primary';
      case 'cashier': return 'bg-info/10 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-muted rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user?.email}
        </span>
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>
          {getRoleLabel()}
        </div>
      </div>
    </header>
  );
};
