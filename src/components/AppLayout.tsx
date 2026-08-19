import { useState, useMemo, useRef, useEffect } from 'react';
import { NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, ScrollText, Archive,
  Menu, Search, ChevronLeft, LogOut, Sun, Moon, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useMentorados, useMentores } from '@/hooks/useSupabaseData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PinSettingsModal } from '@/components/PinModal';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mentorados', label: 'Mentorados', icon: Users },
  { to: '/concluidos', label: 'Concluídos', icon: UserCheck },
  { to: '/arquivados', label: 'Arquivados', icon: Archive },
  { to: '/historico', label: 'Histórico', icon: ScrollText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showPinSettings, setShowPinSettings] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: mentorados = [] } = useMentorados();
  const { data: mentores = [] } = useMentores();
  const displayName = profile?.nome || 'Usuário';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2);

  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase();
    const mts = mentorados.filter(m => m.nome.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)).slice(0, 5).map(m => ({ type: 'mentorado' as const, id: m.id, name: m.nome, sub: m.email || m.cidade }));
    const mrs = mentores.filter(m => m.nome.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)).slice(0, 3).map(m => ({ type: 'mentor' as const, id: m.id, name: m.nome, sub: m.especialidade }));
    return [...mts, ...mrs];
  }, [globalSearch, mentorados, mentores]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
            const active = item.to === '/'
              ? location.pathname === '/'
              : location.pathname === item.to || location.pathname.startsWith(item.to + '/');
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
            onClick={() => setCollapsed(!collapsed)}
            className={cn('hidden md:flex sidebar-item sidebar-item-inactive w-full', collapsed ? 'justify-center px-2' : '')}
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
            className={cn('sidebar-item sidebar-item-inactive w-full mt-1', collapsed && 'justify-center px-2')}
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
            <div className="relative hidden sm:block" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar mentorado, mentor..."
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                className="pl-9 w-64 bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-card"
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-80 rounded-lg border bg-card shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => {
                        if (r.type === 'mentorado') navigate(`/mentorados/${r.id}`);
                        setGlobalSearch('');
                        setSearchOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 hover:bg-accent/40 transition-colors text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                        {r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.type === 'mentorado' ? 'Mentorado' : 'Mentor'} · {r.sub || ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchOpen && globalSearch.trim() && searchResults.length === 0 && (
                <div className="absolute top-full left-0 mt-1 w-80 rounded-lg border bg-card shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado.
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setShowPinSettings(true)} title="Configurar PIN" className="gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Configurar PIN</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}>
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <PinSettingsModal open={showPinSettings} onOpenChange={setShowPinSettings} />
    </div>
  );
}
