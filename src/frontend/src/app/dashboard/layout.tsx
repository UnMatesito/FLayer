'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Badge,
  Divider,
  Toolbar,
  AppBar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import BuildIcon from '@mui/icons-material/Build';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LogoutIcon from '@mui/icons-material/Logout';
import type { SxProps, Theme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import ProtectedRoute from '@/app/protected-route';
import { useAuth } from '@/app/auth-context';
import { fetchLowStock } from '@/app/api';

const DRAWER_WIDTH = 260;

const styles: Record<string, SxProps<Theme>> = {
  root: {
    display: 'flex',
    minHeight: '100vh',
  },
  appBar: {
    zIndex: (t) => t.zIndex.drawer + 1,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
  drawer: {
    width: DRAWER_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: DRAWER_WIDTH,
      boxSizing: 'border-box',
    },
  },
  content: {
    flexGrow: 1,
    p: 3,
    bgcolor: 'grey.50',
    minHeight: '100vh',
  },
  navHeader: {
    p: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  navTitle: {
    fontWeight: 700,
    fontSize: '1.1rem',
  },
  sectionLabel: {
    px: 2,
    py: 1,
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'text.secondary',
    letterSpacing: 1,
  },
  listItem: {
    borderRadius: 1,
    mx: 1,
    mb: 0.25,
  },
};

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, section: 'General' },
  { label: 'Filamentos', path: '/dashboard/stock/filaments', icon: <InventoryIcon />, section: 'Stock' },
  { label: 'Insumos', path: '/dashboard/stock/supplies', icon: <BuildIcon />, section: 'Stock' },
  { label: 'Movimientos', path: '/dashboard/stock/movements', icon: <SwapHorizIcon />, section: 'Stock' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: fetchLowStock,
    refetchInterval: 60_000,
  });

  const lowStockCount = (lowStock?.filaments.length ?? 0) + (lowStock?.supplies.length ?? 0);

  const drawer = (
    <Box>
      <Box sx={styles.navHeader}>
        <Typography sx={styles.navTitle}>Flayer</Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))}
              onClick={() => { router.push(item.path); setMobileOpen(false); }}
              sx={styles.listItem}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.path === '/dashboard/stock/filaments' || item.path === '/dashboard/stock/supplies' ? (
                  <Badge badgeContent={lowStockCount} color="warning" invisible={lowStockCount === 0}>
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ mt: 'auto' }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={logout} sx={styles.listItem}>
            <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Cerrar sesión" primaryTypographyProps={{ fontSize: '0.9rem' }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <ProtectedRoute>
      <Box sx={styles.root}>
        <AppBar position="fixed" sx={styles.appBar} elevation={1}>
          <Toolbar variant="dense" sx={styles.toolbar}>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={600}>Flayer</Typography>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="permanent"
          sx={{
            ...styles.drawer,
            display: { xs: 'none', md: 'block' },
          }}
          open
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            ...styles.drawer,
            display: { xs: 'block', md: 'none' },
          }}
        >
          {drawer}
        </Drawer>

        <Box component="main" sx={styles.content}>
          <Toolbar variant="dense" />
          {children}
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
