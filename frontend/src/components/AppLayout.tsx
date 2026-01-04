import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header } from './Layout';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Product Management',
  '/billing': 'Billing & POS',
  '/customers': 'Customer Management',
  '/expenses': 'Expense Tracking',
  '/analytics': 'Sales Analytics',
  '/inventory': 'Inventory Overview',
};

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const title = pageTitles[location.pathname] || 'RetailPulse';

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          title={title}
        />
        
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>

        <footer className="border-t border-border bg-card px-4 lg:px-6 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Made with <span className="text-rose-500">❤️</span> by <span className="text-foreground font-medium">Sachin Sundar</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
