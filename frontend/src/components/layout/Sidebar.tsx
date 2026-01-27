import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  FileText,
  Wand2,
  CheckSquare,
  Trophy
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: '대시보드', path: '/' },
  { icon: Package, label: '상품 관리', path: '/products' },
  { icon: FileText, label: '원고 유형', path: '/copy-types' },
  { icon: Wand2, label: 'AI 생성', path: '/generator' },
  { icon: CheckSquare, label: '체크리스트', path: '/checklist' },
  { icon: Trophy, label: '베스트 원고', path: '/best' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-card">
      <div className="flex h-14 items-center border-b px-6">
        <h1 className="text-lg font-semibold">Ad Copy Dashboard</h1>
      </div>
      <nav className="space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
