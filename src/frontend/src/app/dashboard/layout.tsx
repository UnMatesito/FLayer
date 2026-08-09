'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Drawer,
  Chip,
  Toolbar,
  AppBar,
  IconButton,
  Tooltip,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useColorScheme, useTheme, styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RedeemIcon from '@mui/icons-material/Redeem';
import InventoryIcon from '@mui/icons-material/Inventory';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import { PrinterIcon } from '@/components/PrinterIcon';
import { FilamentIcon } from '@/components/FilamentIcon';
import { useQuery } from '@tanstack/react-query';
import ProtectedRoute from '@/app/protected-route';
import { useAuth } from '@/app/auth-context';
import { fetchLowStock } from '@/app/api';
import { useResolvedColorScheme } from '@/app/theme';

const NavButton = styled('button')(({ theme }) => ({
  width: '100%',
  '&:hover': { backgroundColor: theme.vars?.palette.railHover ?? theme.palette.railHover },
}));

const DRAWER_WIDTH = 248;
const COLLAPSED_KEY = 'flayer-nav-collapsed';

const styles: Record<string, SxProps<Theme>> = {
  appBar: {
    zIndex: (t) => t.zIndex.drawer + 1,
  },
  drawer: {
    width: DRAWER_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: DRAWER_WIDTH,
      boxSizing: 'border-box',
      borderRight: '1px solid',
      borderColor: 'divider',
      bgcolor: 'rail',
      color: 'ink',
    },
  },
};

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  section: string;
  lowStockKey?: 'filaments' | 'supplies';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, section: 'General' },
  { label: 'Pedidos', path: '/dashboard/orders', icon: <ReceiptLongIcon />, section: 'General' },
  { label: 'Productos', path: '/dashboard/products', icon: <RedeemIcon />, section: 'Catálogo' },
  { label: 'Impresoras', path: '/dashboard/printers', icon: <PrinterIcon color="currentColor" />, section: 'Equipo' },
  { label: 'Filamentos', path: '/dashboard/stock/filaments', icon: <FilamentIcon color="currentColor" hole="var(--rail)" />, section: 'Stock', lowStockKey: 'filaments' },
  { label: 'Insumos', path: '/dashboard/stock/supplies', icon: <InventoryIcon />, section: 'Stock', lowStockKey: 'supplies' },
  { label: 'Historial', path: '/dashboard/stock/movements', icon: <SwapHorizIcon />, section: 'Stock' },
];

function Logotype({ url }: { url: string | null }) {
  if (url) {
    return <img src={url} alt="Logotipo del taller" className="block h-[28px] max-w-[180px] object-contain" />;
  }
  return (
    <span className="text-[1.1rem] font-bold tracking-[0.01em]">
      Flayer
    </span>
  );
}

function SchemeToggle({ color = 'inherit' }: { color?: 'inherit' | 'primary' }) {
  const { mode, setMode } = useColorScheme();
  const resolved = useResolvedColorScheme();
  const isDark = resolved === 'dark';

  const cycleMode = () => {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  };

  const isSystem = mode === 'system';
  const label = isSystem ? 'Modo automático' : isDark ? 'Modo claro' : 'Modo oscuro';

  return (
    <Tooltip title={label}>
      <IconButton
        color={color}
        size="small"
        onClick={cycleMode}
        aria-label={label}
      >
        {isSystem ? (
          <BrightnessAutoIcon fontSize="small" />
        ) : isDark ? (
          <LightModeIcon fontSize="small" />
        ) : (
          <DarkModeIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}

function DrawerContent({
  pathname,
  lowStock,
  logoUrl,
  onNavigate,
}: {
  pathname: string;
  lowStock: { filaments: { length: number }; supplies: { length: number } } | undefined;
  logoUrl: string | null;
  onNavigate: (path: string) => void;
}) {
  const { logout } = useAuth();
  const theme = useTheme();
  const sections = [...new Set(navItems.map((item) => item.section))];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY);
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
  }, []);

  const toggleSection = (section: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const navButtonClass = (selected: boolean) =>
    `group flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[0.85rem] font-medium transition-colors ${
      selected ? 'bg-primary/15 font-semibold' : ''
    }`;

  const itemIcon = (item: NavItem) =>
    item.path === '/dashboard/stock/filaments' ? (
      <FilamentIcon color="currentColor" hole={theme.vars?.palette.rail ?? theme.palette.rail} />
    ) : (
      item.icon
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-[56px] items-center px-4 py-2">
        <Logotype url={logoUrl} />
      </div>
      <hr className="border-line/60" />
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section) => {
          const items = navItems.filter((item) => item.section === section);
          const isCollapsed = collapsed[section];
          return (
            <div key={section} className="mb-1">
              {section !== 'General' && (
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] opacity-60 transition-opacity hover:opacity-100"
                >
                  {section}
                  <ExpandMoreIcon
                    sx={{ fontSize: 14 }}
                    className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              {!isCollapsed && (
                <ul>
                  {items.map((item) => {
                    const selected =
                      pathname === item.path ||
                      (item.path !== '/dashboard' && pathname.startsWith(item.path));
                    return (
                      <li key={item.path} className="mb-0.5">
                        <NavButton
                          type="button"
                          onClick={() => onNavigate(item.path)}
                          className={navButtonClass(selected)}
                        >
                          <span className={`flex w-[22px] shrink-0 items-center justify-center ${selected ? 'text-primary' : 'opacity-60 group-hover:opacity-100'}`}>
                            {itemIcon(item)}
                          </span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.lowStockKey && (lowStock?.[item.lowStockKey].length ?? 0) > 0 && (
                            <Chip
                              size="small"
                              color="warning"
                              label={lowStock?.[item.lowStockKey].length}
                              sx={{
                                height: 20,
                                minWidth: 20,
                                '& .MuiChip-label': { px: 0.6, fontSize: '0.7rem', fontWeight: 700 },
                              }}
                            />
                          )}
                        </NavButton>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="px-2 pb-2">
        <hr className="mb-2 border-line/60" />
        <ul>
          <li className="mb-0.5">
            <NavButton
              type="button"
              onClick={() => onNavigate('/dashboard/profile')}
              className={navButtonClass(pathname === '/dashboard/profile')}
            >
              <span className={`flex w-[22px] shrink-0 items-center justify-center ${pathname === '/dashboard/profile' ? 'text-primary' : 'opacity-60'}`}>
                <PersonOutlineIcon />
              </span>
              <span className="flex-1 text-left">Mi perfil</span>
            </NavButton>
          </li>
          <li className="mb-0.5">
            <NavButton type="button" onClick={logout} className={navButtonClass(false)}>
              <span className="flex w-[22px] shrink-0 items-center justify-center opacity-60">
                <LogoutIcon />
              </span>
              <span className="flex-1 text-left">Cerrar sesión</span>
            </NavButton>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const lowStock = useQuery({
    queryKey: ['low-stock'],
    queryFn: fetchLowStock,
    refetchInterval: 60_000,
  });

  const logoUrl = user?.logo_url ?? null;
  const navigate = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const appBarSx = styles.appBar;
  const appBarStyle: CSSProperties = {
    background: theme.palette.maker,
    color: theme.palette.makerContrastText,
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <AppBar position="fixed" sx={appBarSx} style={appBarStyle}>
          <Toolbar variant="dense" className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
                <MenuIcon />
              </IconButton>
              <Logotype url={logoUrl} />
            </div>
            <SchemeToggle color="inherit" />
          </Toolbar>
        </AppBar>

        <Drawer variant="permanent" sx={{ ...styles.drawer, display: { xs: 'none', md: 'block' } }} open>
          <DrawerContent
            pathname={pathname}
            lowStock={lowStock.data}
            logoUrl={logoUrl}
            onNavigate={navigate}
          />
        </Drawer>

        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ ...styles.drawer, display: { xs: 'block', md: 'none' } }}
        >
          <DrawerContent
            pathname={pathname}
            lowStock={lowStock.data}
            logoUrl={logoUrl}
            onNavigate={navigate}
          />
        </Drawer>

        <main className="min-h-screen flex-1 bg-canvas p-3">
          <Toolbar variant="dense" />
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
