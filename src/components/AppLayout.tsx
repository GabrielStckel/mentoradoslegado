import { useState } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, CalendarDays, CalendarClock,
  Menu, X, Search, Bell, ChevronLeft, LogOut, Settings, Sun, Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mentorados', label: 'Mentorados', icon: Users },
  
  { to: '/encontros', label: 'Encontros', icon: CalendarClock },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const displayName = profile?.nome || 'Usuário';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 md:static',
          collapsed ? 'w-[68px]' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className={cn('flex items-center gap-3 px-4 h-16 border-b border-sidebar-border', collapsed && 'justify-center px-2')}>
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm flex-shrink-0">
            M
          </div>
          {!collapsed && <span className="font-bold text-base text-sidebar-accent-foreground tracking-tight">MentoriaCRM</span>}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'sidebar-item',
                  active ? 'sidebar-item-active' : 'sidebar-item-inactive',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </RouterNavLink>
            );
          })}
        </nav>

        <div className={cn('border-t border-sidebar-border p-3', collapsed && 'px-2')}>
          <button
            onClick={toggleTheme}
            className={cn('sidebar-item sidebar-item-inactive w-full', collapsed && 'justify-center px-2')}
          >
            {theme === 'light' ? <Moon className="h-5 w-5 flex-shrink-0" /> : <Sun className="h-5 w-5 flex-shrink-0" />}
            {!collapsed && <span>{theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex sidebar-item sidebar-item-inactive w-full justify-center"
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span>Recolher</span>}
          </button>
          <div className={cn('flex items-center gap-3 mt-2', collapsed && 'justify-center')}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{displayName}</p>
                <p className="text-xs text-sidebar-muted capitalize">{role || 'usuário'}</p>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className={cn('sidebar-item sidebar-item-inactive w-full mt-2', collapsed && 'justify-center px-2')}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar mentorado, mentor..."
                className="pl-9 w-64 bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-card"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
