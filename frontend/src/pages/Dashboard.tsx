import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  Chip,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Summary = {
  pendingApprovals: number;
  draftPurchaseOrders: number;
  lowStockCount: number;
  lowStockItems: Array<{ id: string; name: string; sku: string; currentStock: number; reorderLevel: number }>;
  todayRevenue?: number;
  todayCompletedSales?: number;
  todaySalesCount?: number;
};

type SalesChartPoint = { label: string; revenue: number; date: string };
type SalesChartPeriod = 'day' | 'week' | 'month' | 'year';

const isAdminOrManager = (role: string) => role === 'admin' || role === 'manager';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesChartPeriod, setSalesChartPeriod] = useState<SalesChartPeriod>('week');
  const [salesChartData, setSalesChartData] = useState<SalesChartPoint[]>([]);
  const [salesChartLoading, setSalesChartLoading] = useState(true);

  useEffect(() => {
    api.get<Summary>('/dashboard/summary').then((r) => {
      setSummary(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSalesChartLoading(true);
    api.get<SalesChartPoint[]>(`/dashboard/sales-chart?period=${salesChartPeriod}`)
      .then((r) => setSalesChartData(r.data ?? []))
      .catch(() => setSalesChartData([]))
      .finally(() => setSalesChartLoading(false));
  }, [salesChartPeriod]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} thickness={4} sx={{ color: '#4f46e5' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading dashboard...</Typography>
        </Box>
      </Box>
    );
  }
  if (!summary) {
    return <Typography color="text.secondary">Failed to load dashboard.</Typography>;
  }

  const firstName = (user?.fullName ?? 'User').split(' ')[0];
  const role = user?.role ?? '';

  const kpiCards = [
    {
      label: 'Pending Approvals',
      value: summary.pendingApprovals,
      sub: 'Awaiting approval',
      icon: <CheckCircleOutlineRoundedIcon />,
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      lightBg: '#eef2ff',
      lightColor: '#4f46e5',
    },
    {
      label: 'Completed',
      value: summary.todayCompletedSales ?? 0,
      sub: 'Sales today',
      icon: <DoneAllRoundedIcon />,
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      lightBg: '#ecfdf5',
      lightColor: '#059669',
    },
    {
      label: 'Low Stock Items',
      value: summary.lowStockCount,
      sub: 'Need reorder',
      icon: <WarningAmberRoundedIcon />,
      gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      lightBg: '#fffbeb',
      lightColor: '#d97706',
    },
    {
      label: 'Revenue',
      value: `$${(summary.todayRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'Today',
      icon: <AttachMoneyRoundedIcon />,
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
      lightBg: '#f5f3ff',
      lightColor: '#7c3aed',
    },
  ];

  const quickActions = [
    { label: 'Add New Item', path: '/items', icon: <AddRoundedIcon />, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Manage Categories', path: '/categories', icon: <CategoryRoundedIcon />, color: '#059669', bg: '#ecfdf5' },
    { label: 'Check Inventory', path: '/inventory', icon: <InventoryRoundedIcon />, color: '#d97706', bg: '#fffbeb' },
    ...(isAdminOrManager(role) ? [{ label: 'View Reports', path: '/reports', icon: <AssessmentRoundedIcon />, color: '#7c3aed', bg: '#f5f3ff' }] : []),
  ];

  const activityItems = [
    summary.pendingApprovals > 0 && { text: `${summary.pendingApprovals} pending approval(s) need attention`, dot: '#4f46e5', time: '1 day ago' },
    summary.draftPurchaseOrders > 0 && { text: `${summary.draftPurchaseOrders} draft purchase order(s)`, dot: '#d97706', time: 'Today' },
    summary.lowStockCount > 0 && { text: `${summary.lowStockCount} low stock item(s) — reorder soon`, dot: '#dc2626', time: 'Today' },
  ].filter(Boolean) as { text: string; dot: string; time: string }[];

  if (activityItems.length === 0) activityItems.push({ text: 'All systems up to date', dot: '#059669', time: 'Today' });

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}>
          Welcome back, {firstName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          Here&apos;s what&apos;s happening at your stationery today.
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        {kpiCards.map((kpi) => (
          <Grid size={{ xs: 6, sm: 3 }} key={kpi.label} sx={{ display: 'flex' }}>
            <Card
              sx={{
                width: '100%',
                border: 'none',
                background: '#fff',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'default',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                },
              }}
            >
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: kpi.gradient }} />
              <CardContent sx={{ p: 2.5, pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {kpi.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 0.75, mb: 0.25, fontSize: '1.75rem', letterSpacing: '-0.02em', color: 'text.primary' }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}>
                    {kpi.sub}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    bgcolor: kpi.lightBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: kpi.lightColor,
                    flexShrink: 0,
                  }}
                >
                  {kpi.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Sales Graph */}
      <Card
        sx={{
          mb: 3.5,
          border: 'none',
          background: 'linear-gradient(180deg, #ffffff 0%, #fafbff 100%)',
          boxShadow: '0 4px 24px rgba(79, 70, 229, 0.06)',
          overflow: 'hidden',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)',
          },
        }}
      >
        <CardContent sx={{ p: 2.5, pt: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4f46e5',
                }}
              >
                <BarChartRoundedIcon sx={{ fontSize: '1.5rem' }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1.1rem', color: 'text.primary', letterSpacing: '-0.02em' }}>
                  Sales overview
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Revenue by period
                </Typography>
              </Box>
            </Box>
            <ToggleButtonGroup
              value={salesChartPeriod}
              exclusive
              onChange={(_, v) => v != null && setSalesChartPeriod(v)}
              size="small"
              sx={{
                '& .MuiToggleButtonGroup-grouped': {
                  border: '1px solid #e5e7eb',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  px: 1.5,
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    color: '#fff',
                    borderColor: 'transparent',
                    '&:hover': { background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)' },
                  },
                },
              }}
            >
              <ToggleButton value="day">Day</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="year">Year</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ height: 280, width: '100%', minWidth: 0 }}>
            {salesChartLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress size={36} thickness={4} sx={{ color: '#4f46e5' }} />
              </Box>
            ) : salesChartData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                <Typography variant="body2">No sales data for this period.</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                <AreaChart data={salesChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontWeight: 600,
                    }}
                    formatter={(value: number) => [typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : value, 'Revenue']}
                    labelStyle={{ fontWeight: 700, color: '#374151' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Box>
          {!salesChartLoading && salesChartData.length > 0 && (
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Total revenue: <strong sx={{ color: 'text.primary' }}>
                  {salesChartData.reduce((s, d) => s + d.revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {salesChartData.length} {salesChartPeriod === 'day' ? 'days' : salesChartPeriod === 'week' ? 'weeks' : salesChartPeriod === 'month' ? 'months' : 'years'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Today's Overview + Alerts */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
            TODAY&apos;S OVERVIEW
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
              <Card sx={{ width: '100%', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid #a7f3d0', transition: 'all 0.25s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(5,150,105,0.12)' } }}>
                <CardContent sx={{ py: 2, px: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TrendingUpRoundedIcon sx={{ fontSize: '1rem', color: '#059669' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#059669', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Completed
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={800} sx={{ fontSize: '1.5rem', color: '#065f46', letterSpacing: '-0.02em' }}>
                    —
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
              <Card sx={{ width: '100%', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', border: '1px solid #c7d2fe', transition: 'all 0.25s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(79,70,229,0.12)' } }}>
                <CardContent sx={{ py: 2, px: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <FlagRoundedIcon sx={{ fontSize: '1rem', color: '#4f46e5' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#4f46e5', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Pending
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={800} sx={{ fontSize: '1.5rem', color: '#312e81', letterSpacing: '-0.02em' }}>
                    {summary.pendingApprovals + summary.draftPurchaseOrders}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
            ALERTS
          </Typography>
          <Card
            sx={{
              bgcolor: summary.lowStockCount > 0 ? '#fef2f2' : '#f9fafb',
              border: `1px solid ${summary.lowStockCount > 0 ? '#fecaca' : '#f3f4f6'}`,
              transition: 'all 0.25s ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.06)' },
            }}
          >
            <CardContent sx={{ py: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 3,
                  bgcolor: summary.lowStockCount > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(156,163,175,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <WarningAmberRoundedIcon sx={{ color: summary.lowStockCount > 0 ? '#dc2626' : '#9ca3af', fontSize: '1.5rem' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700} sx={{ color: summary.lowStockCount > 0 ? '#dc2626' : 'text.secondary', fontSize: '0.9rem', mb: 0.25 }}>
                  {summary.lowStockCount > 0 ? `${summary.lowStockCount} Low Stock Item${summary.lowStockCount !== 1 ? 's' : ''}` : 'No upcoming alerts'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {summary.lowStockCount > 0 ? 'Reorder supplies needed.' : 'No low stock or pending items.'}
                </Typography>
              </Box>
              {summary.lowStockCount > 0 && (
                <Chip label="Urgent" size="small" sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.7rem', height: 24, border: '1px solid #fecaca' }} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions + Recent Activity */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
            QUICK ACTIONS
          </Typography>
          <Grid container spacing={1.5}>
            {quickActions.map((action) => (
              <Grid size={{ xs: 6 }} key={action.path} sx={{ display: 'flex' }}>
                <Card
                  sx={{
                    width: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 8px 24px ${action.color}18`,
                      borderColor: `${action.color}40`,
                    },
                  }}
                  onClick={() => navigate(action.path)}
                >
                  <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        bgcolor: action.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: action.color,
                        transition: 'all 0.25s ease',
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', fontSize: '0.84rem' }}>
                      {action.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
            RECENT ACTIVITY
          </Typography>
          <Card sx={{ minHeight: 200 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {activityItems.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      py: 1.5,
                      borderBottom: i < activityItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                      transition: 'all 0.15s ease',
                      borderRadius: 1,
                      px: 1,
                      mx: -1,
                      '&:hover': { bgcolor: '#f9fafb' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: item.dot,
                        mt: 1,
                        flexShrink: 0,
                        boxShadow: `0 0 0 3px ${item.dot}20`,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.875rem', lineHeight: 1.5 }}>
                        {item.text}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        {item.time}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Low Stock Table */}
      {summary.lowStockItems.length > 0 && (
        <Card sx={{ mt: 3.5 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem', color: 'text.primary' }}>
                  Low Stock Items
                </Typography>
                <Typography variant="caption" color="text.secondary">Items that need reordering</Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: '1rem !important' }} />}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, fontSize: '0.8rem' }}
                onClick={() => navigate('/inventory')}
              >
                View all
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Reorder Level</TableCell>
                    <TableCell sx={{ width: 140 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.lowStockItems.map((item, _idx) => {
                    const pct = Math.min((item.currentStock / item.reorderLevel) * 100, 100);
                    const color = pct < 30 ? '#dc2626' : pct < 60 ? '#d97706' : '#059669';
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{item.sku}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{item.name}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} sx={{ color }}>{item.currentStock}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">{item.reorderLevel}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#f3f4f6',
                                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                              }}
                            />
                            <Typography variant="caption" sx={{ color, fontWeight: 600, fontSize: '0.72rem', minWidth: 32 }}>
                              {Math.round(pct)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
