import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/SidebarContext';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { openMobileSidebar } = useSidebar();
  const handleMenuClick = onMenuClick ?? openMobileSidebar;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={handleMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
      <h2 className="text-lg font-semibold">{title}</h2>
    </header>
  );
}
