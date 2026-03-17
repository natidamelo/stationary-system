import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Tooltip,
  Chip,
  Badge,
  Popover,
  useTheme,
  Fab,
  Fade,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNotifications } from '../context/NotificationsContext';
import SettingsDialog from './SettingsDialog';
import GlobalSearch from './GlobalSearch';

const DRAWER_WIDTH = 272;

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/items': 'Items',
  '/categories': 'Categories',
  '/suppliers': 'Suppliers',
  '/purchase-orders': 'Purchase Orders',
  '/purchase-requests': 'My Requests',
  '/stock-management': 'Stock Management',
  '/inventory': 'Inventory',
  '/distribution': 'Distribution',
  '/users': 'Users',
  '/customers': 'Customers',
  '/registered-tenants': 'Registered Tenants',
  '/licenses': 'Licenses',
  '/reports': 'Reports',
  '/reception': 'Reception',
  '/invoices': 'Invoices',
  '/services': 'Services',
  '/audit-logs': 'Audit Logs',
};

const NAV_ICONS: Record<string, React.ReactNode> = {
  'Dashboard': <DashboardRoundedIcon fontSize="small" />,
  'Reception': <PointOfSaleRoundedIcon fontSize="small" />,
  'Stock Management': <InventoryRoundedIcon fontSize="small" />,
  'Categories': <CategoryRoundedIcon fontSize="small" />,
  'Suppliers': <LocalShippingRoundedIcon fontSize="small" />,
  'Purchase Orders': <ShoppingCartRoundedIcon fontSize="small" />,
  'My Requests': <AssignmentRoundedIcon fontSize="small" />,
  'Approvals': <CheckCircleRoundedIcon fontSize="small" />,
  'Customers': <GroupRoundedIcon fontSize="small" />,
  'Registered Tenants': <BusinessRoundedIcon fontSize="small" />,
  'Licenses': <VpnKeyRoundedIcon fontSize="small" />,
  'User Management': <PeopleRoundedIcon fontSize="small" />,
  'Services': <BuildRoundedIcon fontSize="small" />,
  'Reports': <AssessmentRoundedIcon fontSize="small" />,
  'Invoices': <ReceiptLongRoundedIcon fontSize="small" />,
  'Audit Logs': <SecurityRoundedIcon fontSize="small" />,
};

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Layout() {
  const { user, logout, license } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role ?? '';
  const pathname = location.pathname;
  const pageTitle = pathname === '/purchase-requests' && location.search.includes('pending') ? 'Approvals' : (PAGE_TITLES[pathname] ?? 'Dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [showScroll, setShowScroll] = useState(false);

  const theme = useTheme();
  const { themeMode, toggleTheme } = useSettings();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();

  useEffect(() => {
    const handleScroll = () => setShowScroll(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', end: true, label: 'Dashboard' },
    ...(role === 'reception' || role === 'admin' || role === 'manager' || role === 'dealer' ? [{ to: '/reception', end: false, label: 'Reception' }] : []),
    { to: '/stock-management', end: false, label: 'Stock Management' },
    { to: '/categories', end: false, label: 'Categories' },
    { to: '/suppliers', end: false, label: 'Suppliers' },
    { to: '/purchase-orders', end: false, label: 'Purchase Orders' },
    { to: '/purchase-requests', end: false, label: 'My Requests' },
    ...(role === 'admin' || role === 'manager' || role === 'dealer' ? [{ to: '/purchase-requests?pending=1', end: false, label: 'Approvals' }] : []),
    ...(role === 'dealer' ? [{ to: '/customers', end: false, label: 'Customers' }] : []),
    ...(role === 'dealer' ? [{ to: '/registered-tenants', end: false, label: 'Registered Tenants' }] : []),
    ...(role === 'dealer' ? [{ to: '/licenses', end: false, label: 'Licenses' }] : []),
    ...(role === 'admin' || role === 'manager' || role === 'dealer' ? [{ to: '/users', end: false, label: 'User Management' }] : []),
    ...(role === 'admin' || role === 'manager' || role === 'dealer' ? [{ to: '/services', end: false, label: 'Services' }] : []),
    ...(role === 'admin' || role === 'manager' || role === 'dealer' ? [{ to: '/reports', end: false, label: 'Reports' }] : []),
    ...(role === 'reception' || role === 'admin' || role === 'manager' || role === 'dealer' ? [{ to: '/invoices', end: false, label: 'Invoices' }] : []),
    ...(role === 'admin' || role === 'manager' || role === 'dealer' ? [{ to: '/audit-logs', end: false, label: 'Audit Logs' }] : []),
  ];

  const drawerContent = (
    <>
      <Box sx={{ p: 2.5, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {settings.logoUrl ? (
          <Box
            component="img"
            src={settings.logoUrl}
            alt="Logo"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              objectFit: 'cover',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
          />
        ) : (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            <InventoryRoundedIcon sx={{ fontSize: '1.3rem' }} />
          </Box>
        )}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, color: '#1e293b', letterSpacing: '-0.01em' }}>
            {settings.stationeryName}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
            Management System
          </Typography>
        </Box>
      </Box>

      {/* User card */}
      <Box sx={{ mx: 2, mb: 1.5, p: 1.5, borderRadius: 2.5, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
            fontSize: '0.85rem',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
          }}
        >
          {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} sx={{ color: '#1e293b', fontSize: '0.85rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.fullName}
          </Typography>
          <Chip
            label={user?.role}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              background: '#eef2ff',
              color: '#4f46e5',
              border: '1px solid #e0e7ff',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.5, py: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: '#d1d5db', borderRadius: 2 } }}>
        <Typography variant="overline" sx={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', px: 1, mb: 0.5, display: 'block' }}>
          NAVIGATION
        </Typography>
        <List sx={{ py: 0 }}>
          {navLinks.map((link) => (
            <NavLink key={link.to + link.label} to={link.to} end={link.end as boolean} style={{ textDecoration: 'none', color: 'inherit' }}>
              {({ isActive }) => (
                <ListItemButton
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    mb: 0.3,
                    py: 0.85,
                    px: 1.25,
                    minHeight: 40,
                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                    '&.Mui-selected': {
                      bgcolor: '#eef2ff',
                      '&:hover': { bgcolor: '#e0e7ff' },
                      '& .MuiListItemIcon-root': { color: '#4f46e5' },
                      '& .MuiListItemText-primary': { color: '#4f46e5', fontWeight: 600 },
                    },
                    '&:hover': {
                      bgcolor: '#f1f5f9',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: isActive ? '#4f46e5' : '#94a3b8' }}>
                    {NAV_ICONS[link.label] || <DashboardRoundedIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={link.label}
                    primaryTypographyProps={{
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#4f46e5' : '#475569',
                      sx: { transition: 'color 0.15s ease' },
                    }}
                  />
                </ListItemButton>
              )}
            </NavLink>
          ))}
        </List>
      </Box>

      {/* Logout */}
      <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            py: 0.85,
            px: 1.25,
            '&:hover': { bgcolor: '#fef2f2', '& .MuiListItemIcon-root': { color: '#dc2626' }, '& .MuiListItemText-primary': { color: '#dc2626' } },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: '#94a3b8' }}>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: 500, color: '#64748b' }} />
        </ListItemButton>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', background: theme.palette.mode === 'dark' ? '#1e1e2d' : 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)', color: theme.palette.mode === 'dark' ? '#e2e8f0' : '#1e293b', borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden' },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', background: theme.palette.mode === 'dark' ? '#1e1e2d' : 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)', color: theme.palette.mode === 'dark' ? '#e2e8f0' : '#1e293b', borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, py: 1, minHeight: '64px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ display: { md: 'none' } }}
              >
                <MenuRoundedIcon />
              </IconButton>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary', letterSpacing: '-0.01em', display: { xs: 'none', lg: 'block' } }}>
                {pageTitle}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
              <GlobalSearch />
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', md: 'block' } }} />
              {license?.expiryDate && (
                <Chip
                  size="small"
                  label={`Licensed until ${new Date(license.expiryDate).toLocaleDateString()}`}
                  sx={{
                    bgcolor: '#ecfdf5',
                    color: '#059669',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    height: 26,
                    display: { xs: 'none', sm: 'flex' },
                  }}
                />
              )}
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.84rem' }}>
                {formatDate()}
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', md: 'block' } }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', fontSize: '0.82rem', fontWeight: 700 }}>
                  {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3, fontSize: '0.84rem' }}>{user?.fullName}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', fontSize: '0.72rem' }}>{user?.role}</Typography>
                </Box>
              </Box>
              <Tooltip title={themeMode === 'light' ? 'Dark mode' : 'Light mode'}>
                <IconButton size="small" onClick={toggleTheme} sx={{ color: 'text.secondary', ml: 0.5 }}>
                  {themeMode === 'light' ? <DarkModeRoundedIcon fontSize="small" /> : <LightModeRoundedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Notifications">
                <IconButton size="small" onClick={(e) => setNotifAnchorEl(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                  <Badge badgeContent={unreadCount} color="error" overlap="circular">
                    <NotificationsNoneRoundedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ color: 'text.secondary' }}>
                  <SettingsRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, bgcolor: 'background.default' }}>
          <Outlet />
        </Box>
      </Box>

      {/* Notifications Popover */}
      <Popover
        open={Boolean(notifAnchorEl)}
        anchorEl={notifAnchorEl}
        onClose={() => setNotifAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 340, maxHeight: 480, mt: 1, borderRadius: 3, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {unreadCount > 0 && <Chip label={`${unreadCount} new`} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />}
            {notifications.length > 0 && (
              <Typography variant="caption" sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }} onClick={markAllRead}>
                Mark all read
              </Typography>
            )}
          </Box>
        </Box>
        <List sx={{ p: 0, flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            notifications.map((n) => (
              <ListItemButton
                key={n._id}
                onClick={() => {
                  if (!n.isRead) markRead(n._id);
                  if (n.link) navigate(n.link);
                  setNotifAnchorEl(null);
                }}
                sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: n.isRead ? 'transparent' : 'action.hover', alignItems: 'flex-start', py: 1.5 }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={n.isRead ? 500 : 700} sx={{ color: 'text.primary', mb: 0.5 }}>
                      {n.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.3, mb: 0.5 }}>
                        {n.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                        {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))
          )}
        </List>
        {notifications.length > 0 && (
          <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ cursor: 'pointer', color: 'error.main', '&:hover': { textDecoration: 'underline' } }} onClick={clearAll}>
              Clear all
            </Typography>
          </Box>
        )}
      </Popover>

      {/* Scroll to top */}
      <Fade in={showScroll}>
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{ position: 'fixed', bottom: 24, right: 24, boxShadow: '0 8px 16px rgba(79,70,229,0.3)' }}
        >
          <KeyboardArrowUpRoundedIcon />
        </Fab>
      </Fade>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
}
