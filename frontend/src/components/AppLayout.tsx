import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen w-full">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-card text-foreground px-3 py-2 rounded border border-border shadow-sm">
        Skip to main content
      </a>

      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          title={title}
        />
        
        <main id="main-content" className="flex-1 p-4 lg:p-6 overflow-auto" tabIndex={-1}>
          <Outlet />
        </main>

        <footer className="px-4 lg:px-6 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Made with <span className="text-rose-500">❤️</span> by <span className="text-foreground font-medium">Sachin Sundar</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
