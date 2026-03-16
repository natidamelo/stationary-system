import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { useSettings } from './context/SettingsContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseRequests from './pages/PurchaseRequests';
import Inventory from './pages/Inventory';
import Distribution from './pages/Distribution';
import StockManagement from './pages/StockManagement';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Reception from './pages/Reception';
import Services from './pages/Services';
import Customers from './pages/Customers';
import Licenses from './pages/Licenses';
import Invoices from './pages/Invoices';
import AuditLogs from './pages/AuditLogs';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DealerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'dealer') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const { user } = useAuth();
  const { themeMode } = useSettings();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: { main: '#4f46e5', light: '#a5b4fc', dark: '#3730a3' },
          secondary: { main: '#7c3aed', light: '#c4b5fd', dark: '#5b21b6' },
          success: { main: '#059669', light: '#6ee7b7', dark: '#047857' },
          error: { main: '#dc2626', light: '#fca5a5', dark: '#b91c1c' },
          warning: { main: '#d97706', light: '#fcd34d', dark: '#b45309' },
          info: { main: '#0891b2', light: '#67e8f9', dark: '#0e7490' },
          background: {
            default: themeMode === 'dark' ? '#0f172a' : '#f5f7fb',
            paper: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          },
          text: {
            primary: themeMode === 'dark' ? '#f8fafc' : '#111827',
            secondary: themeMode === 'dark' ? '#94a3b8' : '#6b7280',
          },
          divider: themeMode === 'dark' ? '#334155' : '#e5e7eb',
        },
        typography: {
          fontFamily: '"Inter", "SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif',
          h4: { fontWeight: 700, letterSpacing: '-0.02em' },
          h5: { fontWeight: 700, letterSpacing: '-0.01em' },
          h6: { fontWeight: 600, letterSpacing: '-0.01em' },
          subtitle1: { fontWeight: 600 },
          subtitle2: { fontWeight: 600, letterSpacing: '0.02em' },
          button: { textTransform: 'none' as const, fontWeight: 600 },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { width: '6px', height: '6px' },
                '&::-webkit-scrollbar-thumb': { borderRadius: '3px', background: themeMode === 'dark' ? '#475569' : '#d1d5db' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow: themeMode === 'dark' ? '0 4px 6px -1px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                border: '1px solid',
                borderColor: themeMode === 'dark' ? '#334155' : '#f3f4f6',
                backgroundImage: 'none',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                padding: '8px 20px',
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
              },
              contained: {
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#fff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                backgroundImage: 'none',
              },
              outlined: {
                borderColor: themeMode === 'dark' ? '#334155' : '#f3f4f6',
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 20,
              },
            },
          },
          MuiTableHead: {
            styleOverrides: {
              root: {
                '& .MuiTableCell-head': {
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: themeMode === 'dark' ? '#94a3b8' : '#9ca3af',
                  background: themeMode === 'dark' ? '#0f172a' : '#f9fafb',
                  borderBottom: '1px solid',
                  borderColor: themeMode === 'dark' ? '#334155' : '#f3f4f6',
                },
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: '1px solid',
                borderColor: themeMode === 'dark' ? '#334155' : '#f3f4f6',
                padding: '14px 16px',
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                transition: 'background 0.15s ease',
                '&:hover': {
                  background: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                },
              },
            },
          },
        },
      }),
    [themeMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {!user ? (
          <Route path="/" element={<Landing />} />
        ) : (
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="items" element={<Items />} />
            <Route path="categories" element={<Categories />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="purchase-requests" element={<PurchaseRequests />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="distribution" element={<Distribution />} />
            <Route path="stock-management" element={<StockManagement />} />
            <Route path="users" element={<Users />} />
            <Route path="customers" element={<DealerRoute><Customers /></DealerRoute>} />
            <Route path="licenses" element={<DealerRoute><Licenses /></DealerRoute>} />
            <Route path="reports" element={<Reports />} />
            <Route path="reception" element={<Reception />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="services" element={<Services />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
