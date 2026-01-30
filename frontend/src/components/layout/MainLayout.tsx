import { useState } from 'react';
import { Sidebar, MobileSidebar } from './Sidebar';
import { SidebarContext } from '@/contexts/SidebarContext';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ openMobileSidebar: () => setSidebarOpen(true) }}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        <main className="lg:ml-64">
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
