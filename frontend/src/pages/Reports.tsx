import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  IconButton,
  Chip,
} from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type StockRow = { sku: string; name: string; category?: string; unit: string; reorderLevel: number; currentStock: number; price: number };
type Period = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
type SaleLineRow = { type: string; name: string; quantity: number; unitPrice: number; total: number };
type SalesReportSale = {
  id: string;
  saleNumber: string;
  soldAt: string;
  soldBy: string;
  customerName: string;
  paymentMethod: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes: string;
  lines: SaleLineRow[];
};
type SalesReportData = {
  period: string;
  start: string;
  end: string;
  totalRevenue: number;
  transactionCount: number;
  sales: SalesReportSale[];
};
type RevenueTrendPoint = { label: string; revenue: number; date: string };
type BusinessOverview = {
  totalItems: number;
  totalCategories: number;
  totalSuppliers: number;
  totalUsers: number;
  salesLast30Days: number;
  distributionsLast30Days: number;
  lowStockCount: number;
  revenueTrend?: RevenueTrendPoint[];
};
type OperatingExpenseRow = { id: string; date: string; description: string; amount: number; category?: string };
type CostProfit = {
  period: string;
  revenue: number;
  itemRevenue?: number;
  serviceRevenue?: number;
  purchaseCost: number;
  costOfGoodsSold?: number;
  itemCosts?: number;
  serviceCosts?: number;
  grossProfit?: number;
  grossMarginPct?: number;
  operatingExpensesTotal?: number;
  operatingExpenses?: OperatingExpenseRow[];
  netProfit?: number;
  netMarginPct?: number;
  totalCosts?: number;
  transactionCount: number;
  purchaseOrderCount: number;
  profit: number;
  marginPercent: number;
};
type ServiceAnalytics = {
  period: string;
  start?: string;
  end?: string;
  totalDistributions: number;
  totalItemsIssued: number;
  uniqueRecipients: number;
  avgItemsPerDistribution: number;
  byDepartment: Array<{ department: string; distributionCount: number; itemsIssued: number }>;
  topItems: Array<{ itemId: string; itemName: string; sku: string; quantity: number }>;
  trend: Array<{ label: string; count: number; date: string }>;
  recentDistributions: Array<{
    id: string;
    distributionNumber: string;
    department: string;
    issuedTo: string | null;
    itemCount: number;
    lineCount: number;
    createdAt: string;
  }>;
};
type InventoryReport = {
  summary: { totalItems: number; totalUnits: number; totalInventoryValue: number; lowStockCount: number };
  items: StockRow[];
  lowStockItems: StockRow[];
};

const isAdminOrManager = (role: string) => role === 'admin' || role === 'manager';
type TabId = 'sales' | 'overview' | 'financial' | 'service' | 'stock' | 'inventory';
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'This Month' },
  { value: 'quarterly', label: 'This Quarter' },
  { value: 'yearly', label: 'This Year' },
];
const TAB_OPTIONS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Business Overview' },
  { id: 'sales', label: 'Sales Report' },
  { id: 'financial', label: 'Financial Report' },
  { id: 'service', label: 'Service Analytics' },
  { id: 'stock', label: 'Stock Movement' },
  { id: 'inventory', label: 'Inventory Reports' },
];

function KpiCard({ label, value, sub, icon, accentColor, loading }: { label: string; value: string | number; sub: string; icon: React.ReactNode; accentColor: string; loading?: boolean }) {
  return (
    <Card
      sx={{
        width: '100%',
        background: '#fff',
        border: '1px solid #f3f4f6',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.06)' },
      }}
    >
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor }} />
      <CardContent sx={{ p: 2, pt: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 0.25, fontSize: '1.4rem', letterSpacing: '-0.02em', color: '#111827' }}>
            {loading ? '...' : value}
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, fontSize: '0.72rem' }}>
            {sub}
          </Typography>
        </Box>
        <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: `${accentColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, flexShrink: 0 }}>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState<Period>('monthly');
  const [stockByPeriod, setStockByPeriod] = useState<{
    period: string;
    byItem: Array<{ itemId: string; sku: string; name: string; in: number; out: number }>;
    summary: { totalMovements: number; itemsAffected: number };
  } | null>(null);
  const [overview, setOverview] = useState<BusinessOverview | null>(null);
  const [costProfit, setCostProfit] = useState<CostProfit | null>(null);
  const [serviceAnalytics, setServiceAnalytics] = useState<ServiceAnalytics | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingCostProfit, setLoadingCostProfit] = useState(false);
  const [loadingService, setLoadingService] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', amount: '', category: '' });
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [hoveredTrend, setHoveredTrend] = useState<number | null>(null);
  const [salesReportData, setSalesReportData] = useState<SalesReportData | null>(null);
  const [loadingSalesReport, setLoadingSalesReport] = useState(false);

  const role = user?.role ?? '';
  const showAdminReports = isAdminOrManager(role);

  const loadOverview = () => {
    if (!showAdminReports) return;
    setLoadingOverview(true);
    api.get<BusinessOverview>(`/reports/business-overview?period=${period}`).then((r) => setOverview(r.data)).catch(() => {}).finally(() => setLoadingOverview(false));
  };
  const loadCostProfit = () => {
    if (!showAdminReports) return;
    setLoadingCostProfit(true);
    api.get<CostProfit>(`/reports/cost-profit?period=${period}`).then((r) => setCostProfit(r.data)).catch(() => {}).finally(() => setLoadingCostProfit(false));
  };
  const loadService = () => {
    if (!showAdminReports) return;
    setLoadingService(true);
    const empty: ServiceAnalytics = { period, totalDistributions: 0, totalItemsIssued: 0, uniqueRecipients: 0, avgItemsPerDistribution: 0, byDepartment: [], topItems: [], trend: [], recentDistributions: [] };
    api.get<ServiceAnalytics>(`/reports/service-analytics?period=${period}`)
      .then((r) => setServiceAnalytics(r.data ?? empty))
      .catch(() => setServiceAnalytics(empty))
      .finally(() => setLoadingService(false));
  };
  const loadStockPeriod = () => {
    if (!showAdminReports) return;
    setLoadingPeriod(true);
    api.get(`/reports/stock/period?period=${period}`).then((r) => setStockByPeriod(r.data)).catch(() => {}).finally(() => setLoadingPeriod(false));
  };
  const loadInventory = () => {
    if (!showAdminReports) return;
    setLoadingInventory(true);
    api.get<InventoryReport>('/reports/inventory').then((r) => setInventoryReport(r.data)).catch(() => {}).finally(() => setLoadingInventory(false));
  };
  const loadSalesReport = () => {
    if (!showAdminReports) return;
    setLoadingSalesReport(true);
    api.get<SalesReportData>(`/reports/sales?period=${period}`)
      .then((r) => setSalesReportData(r.data))
      .catch(() => setSalesReportData(null))
      .finally(() => setLoadingSalesReport(false));
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expenseForm.amount);
    if (!expenseForm.description.trim() || isNaN(amount) || amount <= 0) return;
    setExpenseSubmitting(true);
    api.post('/reports/operating-expenses', { date: expenseForm.date, description: expenseForm.description.trim(), amount, category: expenseForm.category.trim() || undefined })
      .then(() => {
        setShowAddExpense(false);
        setExpenseForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '', category: '' });
        loadCostProfit();
      })
      .catch(() => {})
      .finally(() => setExpenseSubmitting(false));
  };
  const handleDeleteExpense = (id: string) => {
    if (!confirm('Delete this operating expense?')) return;
    api.delete(`/reports/operating-expenses/${id}`).then(() => loadCostProfit()).catch(() => {});
  };

  useEffect(() => { loadOverview(); }, [showAdminReports, period]);
  useEffect(() => { loadCostProfit(); }, [showAdminReports, period]);
  useEffect(() => { loadService(); }, [showAdminReports, period]);
  useEffect(() => { loadStockPeriod(); }, [showAdminReports, period]);
  useEffect(() => { loadInventory(); }, [showAdminReports]);
  useEffect(() => { loadSalesReport(); }, [showAdminReports, period]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? 'This Month';
  const handleRefresh = () => { loadOverview(); loadCostProfit(); loadService(); loadStockPeriod(); loadInventory(); loadSalesReport(); };
  const downloadSalesPdf = async () => {
    if (!salesReportData) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
    const title = `Sales Report – ${periodLabel}`;
    const startStr = salesReportData.start ? new Date(salesReportData.start).toLocaleDateString() : '';
    const endStr = salesReportData.end ? new Date(salesReportData.end).toLocaleDateString() : '';
    doc.setFontSize(14);
    doc.text(title, 14, 12);
    doc.setFontSize(10);
    doc.text(`Period: ${startStr} – ${endStr}  |  Transactions: ${salesReportData.transactionCount}  |  Total Revenue: ${Number(salesReportData.totalRevenue).toFixed(2)}`, 14, 18);
    const tableData: string[][] = [];
    for (const s of salesReportData.sales) {
      tableData.push([
        s.saleNumber,
        s.soldAt ? new Date(s.soldAt).toLocaleString() : '—',
        s.soldBy,
        s.customerName,
        s.paymentMethod,
        Number(s.totalAmount).toFixed(2),
        Number(s.amountPaid).toFixed(2),
        Number(s.balanceDue).toFixed(2),
        '',
      ]);
      for (const ln of s.lines || []) {
        tableData.push(['', '', '', '', ln.type, ln.name, String(ln.quantity), Number(ln.unitPrice).toFixed(2), Number(ln.total).toFixed(2)]);
      }
    }
    const totalRevenue = Number(salesReportData.totalRevenue).toFixed(2);
    const totalTransactions = salesReportData.transactionCount;
    autoTable(doc, {
      startY: 24,
      head: [['Sale #', 'Date/Time', 'Reception', 'Customer', 'Payment', 'Total', 'Paid', 'Balance', 'Line (Type / Name / Qty / Price / Total)']],
      body: tableData.length ? tableData : [['No sales in this period', '', '', '', '', '', '', '', '']],
      foot: tableData.length ? [['', '', '', '', 'TOTAL', totalRevenue, `${totalTransactions} transactions`, '', '']] : [],
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      footStyles: { fillColor: [200, 220, 240], fontStyle: 'bold', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 20 }, 1: { cellWidth: 30 }, 2: { cellWidth: 26 }, 3: { cellWidth: 26 },
        4: { cellWidth: 18 }, 5: { cellWidth: 20 }, 6: { cellWidth: 20 }, 7: { cellWidth: 20 }, 8: { cellWidth: 50 },
      },
    });
    const finalY = (doc as any).lastAutoTable?.finalY ?? 24;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL REVENUE: ${totalRevenue}  (${totalTransactions} transactions)`, 14, finalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.save(`sales-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  const downloadCsv = async () => {
    const token = localStorage.getItem('token');
    const r = await fetch('/api/reports/stock/csv', { headers: { Authorization: `Bearer ${token}` } });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const getMaxQuantity = () => (serviceAnalytics?.topItems?.length ? Math.max(...serviceAnalytics.topItems.map((i) => i.quantity), 1) : 1);

  if (!showAdminReports) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700}>Reports</Typography>
        <Typography color="text.secondary">Stock and financial reports are available only to administrators.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Reports & Analytics</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Business insights and performance metrics</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v: number) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          {TAB_OPTIONS.map((t, i) => (
            <Tab key={t.id} label={t.label} value={i} />
          ))}
        </Tabs>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {PERIOD_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              onClick={() => setPeriod(o.value)}
              variant={period === o.value ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600,
                fontSize: '0.78rem',
                ...(period === o.value
                  ? { bgcolor: '#4f46e5', color: '#fff' }
                  : { borderColor: '#e5e7eb', color: '#6b7280', '&:hover': { bgcolor: '#f9fafb' } }),
              }}
            />
          ))}
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={handleRefresh}>Refresh</Button>
          <Button size="small" variant="outlined" onClick={downloadCsv}>Export CSV</Button>
          <Button size="small" variant="outlined" onClick={() => window.print()}>Export PDF</Button>
        </Box>
      </Box>

      {/* Sales Report */}
      {activeTab === 1 && (
        <>
          <Card sx={{ p: 2.5, mb: 2.5 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Typography variant="h6" fontWeight={700}>Sales Report</Typography>
              <Button size="small" variant="contained" onClick={downloadSalesPdf} disabled={!salesReportData}>
                Download PDF
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {salesReportData?.start && salesReportData?.end && (
                <>Period: {new Date(salesReportData.start).toLocaleDateString()} – {new Date(salesReportData.end).toLocaleDateString()}</>
              )}
              {salesReportData && `  •  ${salesReportData.transactionCount} transactions  •  Total revenue: ${Number(salesReportData.totalRevenue).toFixed(2)}`}
            </Typography>
          </Card>
          {loadingSalesReport ? (
            <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
          ) : (
            <Card sx={{ mb: 2.5 }}>
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sale #</TableCell>
                      <TableCell>Date / Time</TableCell>
                      <TableCell>Reception</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Payment</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Paid</TableCell>
                      <TableCell align="right">Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!salesReportData?.sales?.length ? (
                      <TableRow><TableCell colSpan={8} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No sales in this period</Typography></TableCell></TableRow>
                    ) : (
                      salesReportData.sales.map((s) => (
                        <React.Fragment key={s.id}>
                          <TableRow>
                            <TableCell><Typography variant="body2" fontWeight={600}>{s.saleNumber}</Typography></TableCell>
                            <TableCell>{s.soldAt ? new Date(s.soldAt).toLocaleString() : '—'}</TableCell>
                            <TableCell>{s.soldBy}</TableCell>
                            <TableCell>{s.customerName}</TableCell>
                            <TableCell>{s.paymentMethod}</TableCell>
                            <TableCell align="right"><Typography variant="body2" fontWeight={600}>{Number(s.totalAmount).toFixed(2)}</Typography></TableCell>
                            <TableCell align="right">{Number(s.amountPaid).toFixed(2)}</TableCell>
                            <TableCell align="right">{Number(s.balanceDue).toFixed(2)}</TableCell>
                          </TableRow>
                          {(s.lines || []).map((ln, i) => (
                            <TableRow key={`${s.id}-${i}`} sx={{ bgcolor: '#f9fafb' }}>
                              <TableCell colSpan={2} sx={{ borderBottom: 'none', pl: 4 }} />
                              <TableCell colSpan={2} sx={{ borderBottom: 'none', fontSize: '0.8rem', color: 'text.secondary' }}>{ln.type}: {ln.name}</TableCell>
                              <TableCell sx={{ borderBottom: 'none', color: 'text.secondary' }}>{ln.quantity} × {Number(ln.unitPrice).toFixed(2)}</TableCell>
                              <TableCell colSpan={2} sx={{ borderBottom: 'none' }} />
                              <TableCell align="right" sx={{ borderBottom: 'none', color: 'text.secondary' }}>{Number(ln.total).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {/* Overview */}
      {activeTab === 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Total Items', value: overview?.totalItems ?? 0, sub: 'Active products', icon: <InventoryRoundedIcon />, color: '#4f46e5' },
              { label: 'Categories', value: overview?.totalCategories ?? 0, sub: 'Product categories', icon: <CategoryRoundedIcon />, color: '#059669' },
              { label: 'Sales (30 days)', value: overview?.salesLast30Days ?? 0, sub: 'Transactions', icon: <ReceiptLongRoundedIcon />, color: '#7c3aed' },
              { label: 'Distributions (30 days)', value: overview?.distributionsLast30Days ?? 0, sub: 'Issues to departments', icon: <LocalShippingRoundedIcon />, color: '#d97706' },
              { label: 'Low Stock Items', value: overview?.lowStockCount ?? 0, sub: 'Need reorder', icon: <WarningAmberRoundedIcon />, color: (overview?.lowStockCount ?? 0) > 0 ? '#dc2626' : '#6b7280' },
            ].map((k) => (
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={k.label} sx={{ display: 'flex' }}>
                <KpiCard label={k.label} value={k.value} sub={k.sub} icon={k.icon} accentColor={k.color} loading={loadingOverview} />
              </Grid>
            ))}
          </Grid>

          {/* Revenue Trend Chart */}
          {overview?.revenueTrend && overview.revenueTrend.length > 0 && (() => {
            const trend = overview.revenueTrend;
            const totalRevenue = trend.reduce((s, p) => s + p.revenue, 0);
            const avgRevenue = totalRevenue / trend.length;
            const peakRevenue = Math.max(...trend.map((p) => p.revenue));
            const firstRevenue = trend[0]?.revenue ?? 0;
            const lastRevenue = trend[trend.length - 1]?.revenue ?? 0;
            const revenueChange = firstRevenue > 0 ? ((lastRevenue - firstRevenue) / firstRevenue) * 100 : 0;
            const rawMax = Math.max(...trend.map((p) => p.revenue), 1);
            const niceStep = (v: number) => {
              const exp = Math.pow(10, Math.floor(Math.log10(v)));
              const n = v / exp;
              const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
              return exp * step;
            };
            const step = niceStep(rawMax / 4);
            const maxY = Math.ceil(rawMax / step) * step || step;
            const padding = { top: 24, right: 24, bottom: 44, left: 64 };
            const chartW = 420;
            const chartH = 200;
            const w = chartW + padding.left + padding.right;
            const h = chartH + padding.top + padding.bottom;
            const yTicks = 5;
            const points = trend.map((p, i) => {
              const x = padding.left + (trend.length > 1 ? (i / (trend.length - 1)) * chartW : chartW / 2);
              const y = padding.top + chartH - (p.revenue / maxY) * chartH;
              return { x, y, ...p, index: i };
            });
            const smoothPath = (pts: { x: number; y: number }[]) => {
              if (pts.length < 2) return '';
              let d = `M ${pts[0].x} ${pts[0].y}`;
              for (let i = 1; i < pts.length; i++) {
                const p0 = pts[i - 1];
                const p1 = pts[i];
                const cpX = (p0.x + p1.x) / 2;
                d += ` Q ${cpX} ${p0.y}, ${cpX} ${(p0.y + p1.y) / 2} Q ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
              }
              return d;
            };
            const linePath = smoothPath(points);
            const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z` : '';
            const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => ({ y: padding.top + chartH - (i / yTicks) * chartH, value: (i / yTicks) * maxY }));
            const formatCurrency = (val: number) => `${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
            return (
              <Card sx={{ p: 3, mb: 3 }}>
                {/* Chart header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em', mb: 0.5 }}>Revenue Trend</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>Revenue over time — {periodLabel}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Revenue</Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#059669', fontSize: '1.1rem' }}>{formatCurrency(totalRevenue)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average</Typography>
                      <Typography variant="body1" fontWeight={700} sx={{ fontSize: '1rem' }}>{formatCurrency(avgRevenue)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Peak</Typography>
                      <Typography variant="body1" fontWeight={700} sx={{ color: '#4f46e5', fontSize: '1rem' }}>{formatCurrency(peakRevenue)}</Typography>
                    </Box>
                    {trend.length > 1 && (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Change</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.3 }}>
                          {revenueChange >= 0 ? <TrendingUpRoundedIcon sx={{ fontSize: '1rem', color: '#059669' }} /> : <TrendingDownRoundedIcon sx={{ fontSize: '1rem', color: '#dc2626' }} />}
                          <Typography variant="body1" fontWeight={700} sx={{ color: revenueChange >= 0 ? '#059669' : '#dc2626', fontSize: '1rem' }}>
                            {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* SVG Chart */}
                <Box sx={{ position: 'relative', overflow: 'auto', pb: 1, mx: -1 }}>
                  <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', minWidth: 520, height: 260 }} preserveAspectRatio="xMinYMin meet" onMouseLeave={() => setHoveredPoint(null)}>
                    <defs>
                      <linearGradient id="revAreaGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.02" />
                        <stop offset="40%" stopColor="#818cf8" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
                      </linearGradient>
                      <linearGradient id="revLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#a5b4fc" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                      <filter id="revGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#818cf8" floodOpacity="0.2"/>
                      </filter>
                      <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.3"/>
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {gridLines.map((t, i) => (
                      <g key={i}>
                        <line x1={padding.left} y1={t.y} x2={padding.left + chartW} y2={t.y} stroke={i === 0 ? '#e5e7eb' : '#f3f4f6'} strokeWidth="1" />
                        <text x={padding.left - 10} y={t.y + 4} textAnchor="end" fontSize="11" fill="#9ca3af" fontWeight={500} fontFamily="Inter, system-ui, sans-serif">
                          {t.value === 0 ? '0' : t.value >= 1000 ? `${(t.value / 1000).toFixed(1)}k` : t.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </text>
                      </g>
                    ))}

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#revAreaGrad)" />

                    {/* Main line */}
                    <path d={linePath} fill="none" stroke="url(#revLineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#revGlow)" />

                    {/* Data points & tooltips */}
                    {points.map((p) => {
                      const isHovered = hoveredPoint === p.index;
                      return (
                        <g key={p.date}>
                          {/* Hover crosshair */}
                          {isHovered && (
                            <>
                              <line x1={p.x} y1={padding.top} x2={p.x} y2={padding.top + chartH} stroke="#c7d2fe" strokeWidth="1" strokeDasharray="3,3" />
                              <circle cx={p.x} cy={p.y} r="12" fill="#6366f1" opacity="0.08" />
                            </>
                          )}
                          {/* Tooltip */}
                          {isHovered && (
                            <g transform={`translate(${p.x}, ${p.y - 32})`}>
                              <rect x="-50" y="-22" width="100" height="22" rx="8" fill="#1e1b4b" opacity="0.92" />
                              <text x="0" y="-7" textAnchor="middle" fontSize="11" fill="#e0e7ff" fontWeight={600} fontFamily="Inter, system-ui, sans-serif">
                                {formatCurrency(p.revenue)}
                              </text>
                            </g>
                          )}
                          {/* Dot */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isHovered ? 6 : 3.5}
                            fill={isHovered ? '#6366f1' : '#fff'}
                            stroke="#818cf8"
                            strokeWidth={isHovered ? 2.5 : 2}
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            filter={isHovered ? 'url(#dotGlow)' : undefined}
                            onMouseEnter={() => setHoveredPoint(p.index)}
                            onMouseMove={() => setHoveredPoint(p.index)}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </Box>

                {/* X-axis labels */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: '13%', flexWrap: 'wrap', gap: 0.5 }}>
                  {trend.map((p, i) => (
                    <Typography
                      key={p.date}
                      variant="caption"
                      color={hoveredPoint === i ? 'primary.main' : 'text.secondary'}
                      fontWeight={hoveredPoint === i ? 700 : 400}
                      sx={{ transition: 'all 0.15s', cursor: 'pointer', fontSize: '0.7rem' }}
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {p.label}
                    </Typography>
                  ))}
                </Box>

                {/* Summary footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: 1, borderColor: '#f3f4f6', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>
                    <strong>Total:</strong> {formatCurrency(totalRevenue)} &middot; <strong>Avg:</strong> {formatCurrency(avgRevenue)} &middot; <strong>Peak:</strong> {formatCurrency(peakRevenue)}
                  </Typography>
                  {trend.length > 1 && (
                    <Chip
                      icon={revenueChange >= 0 ? <TrendingUpRoundedIcon sx={{ fontSize: '0.9rem !important' }} /> : <TrendingDownRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
                      label={`${Math.abs(revenueChange).toFixed(1)}% vs first period`}
                      size="small"
                      sx={{
                        bgcolor: revenueChange >= 0 ? '#ecfdf5' : '#fef2f2',
                        color: revenueChange >= 0 ? '#059669' : '#dc2626',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        border: `1px solid ${revenueChange >= 0 ? '#a7f3d0' : '#fecaca'}`,
                      }}
                    />
                  )}
                </Box>
              </Card>
            );
          })()}
        </>
      )}

      {/* Financial */}
      {activeTab === 2 && (
        <>
          <Card sx={{ p: 2.5, mb: 2.5 }}>
            <Typography variant="h6" fontWeight={700}>Financial Report — Cost & Profit Analysis</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Revenue breakdown and profit margins</Typography>
          </Card>
          <Card sx={{ p: 2.5, mb: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Revenue Breakdown</Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {[
                { label: 'Total Revenue:', value: costProfit?.revenue ?? 0, neg: false, pct: null },
                ...(costProfit?.itemRevenue != null && costProfit?.serviceRevenue != null ? [
                  { label: '  • Items Revenue:', value: costProfit.itemRevenue, neg: false, pct: null, indent: true },
                  { label: '  • Services Revenue:', value: costProfit.serviceRevenue, neg: false, pct: null, indent: true },
                ] : []),
                { label: 'Cost of Goods Sold:', value: costProfit?.costOfGoodsSold ?? costProfit?.purchaseCost ?? 0, neg: true, pct: null },
                ...(costProfit?.itemCosts != null && costProfit?.serviceCosts != null ? [
                  { label: '  • Items Cost:', value: costProfit.itemCosts, neg: true, pct: null, indent: true },
                  { label: '  • Services Cost:', value: costProfit.serviceCosts, neg: true, pct: null, indent: true },
                ] : []),
                { label: 'Gross Profit:', value: costProfit?.grossProfit ?? 0, neg: false, pct: costProfit?.grossMarginPct },
                { label: 'Operating Expenses:', value: costProfit?.operatingExpensesTotal ?? 0, neg: true, pct: null },
                { label: 'Net Profit:', value: costProfit?.netProfit ?? costProfit?.profit ?? 0, neg: (costProfit?.netProfit ?? costProfit?.profit ?? 0) < 0, pct: costProfit?.netMarginPct ?? costProfit?.marginPercent },
              ].map((row) => (
                <Box key={row.label} sx={{ display: 'flex', alignItems: 'baseline', gap: 1, py: 0.85, borderBottom: '1px solid #f3f4f6', pl: row.indent ? 2 : 0 }}>
                  <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                  <Typography component="span" fontWeight={600} color={row.neg ? 'error.main' : row.value >= 0 ? 'success.main' : 'error.main'}>
                    {loadingCostProfit ? '…' : `${row.neg && row.value ? '-' : ''}${Number(row.neg ? Math.abs(Number(row.value)) : row.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
                  </Typography>
                  {row.pct != null && !loadingCostProfit && <Typography component="span" variant="body2" color="text.secondary">({Number(row.pct).toFixed(1)}%)</Typography>}
                </Box>
              ))}
            </Box>
          </Card>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 6 }} sx={{ display: 'flex' }}>
              <KpiCard label="Gross Margin" value={loadingCostProfit ? '...' : `${Number(costProfit?.grossMarginPct ?? 0).toFixed(1)}%`} sub="Profit after COGS" icon={<TrendingUpRoundedIcon />} accentColor="#059669" />
            </Grid>
            <Grid size={{ xs: 6 }} sx={{ display: 'flex' }}>
              <KpiCard
                label="Net Margin"
                value={loadingCostProfit ? '...' : `${Number(costProfit?.netMarginPct ?? costProfit?.marginPercent ?? 0).toFixed(1)}%`}
                sub="After all expenses"
                icon={(costProfit?.netMarginPct ?? costProfit?.marginPercent ?? 0) >= 0 ? <TrendingUpRoundedIcon /> : <TrendingDownRoundedIcon />}
                accentColor={(costProfit?.netMarginPct ?? costProfit?.marginPercent ?? 0) >= 0 ? '#059669' : '#dc2626'}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {[
              { label: 'Revenue', value: costProfit?.revenue ?? 0, color: '#4f46e5', icon: <ReceiptLongRoundedIcon /> },
              { label: 'Total Costs', value: costProfit?.totalCosts ?? 0, color: '#6b7280', icon: <InventoryRoundedIcon /> },
              { label: 'Net Profit', value: costProfit?.netProfit ?? costProfit?.profit ?? 0, color: ((costProfit?.netProfit ?? costProfit?.profit ?? 0) >= 0) ? '#059669' : '#dc2626', icon: <TrendingUpRoundedIcon /> },
              { label: 'Operating Expenses', value: costProfit?.operatingExpensesTotal ?? 0, color: '#d97706', icon: <WarningAmberRoundedIcon /> },
            ].map((s) => (
              <Grid size={{ xs: 6, sm: 3 }} key={s.label} sx={{ display: 'flex' }}>
                <KpiCard label={s.label} value={`${Number(s.value).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB`} sub="" icon={s.icon} accentColor={s.color} loading={loadingCostProfit} />
              </Grid>
            ))}
          </Grid>
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>Operating Expenses</Typography>
              <Button variant="contained" size="small" onClick={() => setShowAddExpense(true)}>Add Expense</Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Detailed list of recorded operating expenses</Typography>
            {costProfit?.operatingExpenses?.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Amount (ETB)</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costProfit.operatingExpenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{typeof e.date === 'string' ? e.date.slice(0, 10) : new Date(e.date).toISOString().slice(0, 10)}</TableCell>
                        <TableCell><Typography variant="body2" fontWeight={500}>{e.description}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{e.category || '—'}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight={600}>{Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleDeleteExpense(e.id)} sx={{ color: '#dc2626', '&:hover': { bgcolor: '#fef2f2' } }}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2 }}>No operating expenses recorded for this period.</Typography>
            )}
          </Card>

          <Dialog open={showAddExpense} onClose={() => !expenseSubmitting && setShowAddExpense(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add Operating Expense</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                <TextField type="date" label="Date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
                <TextField label="Description" value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Rent, Utilities" fullWidth />
                <TextField type="number" label="Amount (ETB)" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} fullWidth />
                <TextField label="Category (optional)" value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} fullWidth />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => !expenseSubmitting && setShowAddExpense(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
              <Button variant="contained" disabled={expenseSubmitting || !expenseForm.description.trim() || !expenseForm.amount} onClick={handleAddExpense}>
                {expenseSubmitting ? 'Adding…' : 'Add Expense'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* Service Analytics */}
      {activeTab === 3 && (() => {
        const sa = serviceAnalytics;
        const maxDept = sa?.byDepartment?.length ? Math.max(...sa.byDepartment.map((d) => d.itemsIssued), 1) : 1;
        const trendData = sa?.trend ?? [];
        const maxTrend = trendData.length ? Math.max(...trendData.map((t) => t.count), 1) : 1;
        const trendPad = { top: 20, right: 20, bottom: 36, left: 44 };
        const trendChartW = 400;
        const trendChartH = 140;
        const trendW = trendChartW + trendPad.left + trendPad.right;
        const trendH = trendChartH + trendPad.top + trendPad.bottom;
        const trendPoints = trendData.map((t, i) => ({
          x: trendPad.left + (trendData.length > 1 ? (i / (trendData.length - 1)) * trendChartW : trendChartW / 2),
          y: trendPad.top + trendChartH - (t.count / maxTrend) * trendChartH,
          ...t,
          index: i,
        }));
        const buildPath = (pts: { x: number; y: number }[]) => {
          if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y}` : '';
          let d = `M ${pts[0].x} ${pts[0].y}`;
          for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1]; const p1 = pts[i];
            const cpX = (p0.x + p1.x) / 2;
            d += ` Q ${cpX} ${p0.y}, ${cpX} ${(p0.y + p1.y) / 2} Q ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
          }
          return d;
        };
        const trendLine = buildPath(trendPoints);
        const trendArea = trendPoints.length
          ? `${trendLine} L ${trendPoints[trendPoints.length - 1].x} ${trendPad.top + trendChartH} L ${trendPoints[0].x} ${trendPad.top + trendChartH} Z`
          : '';
        const hasData = !!(sa?.totalDistributions);
        return (
          <>
            {/* KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              {[
                { label: 'Total Distributions', value: sa?.totalDistributions ?? 0, sub: 'This period', icon: <LocalShippingRoundedIcon />, color: '#4f46e5' },
                { label: 'Items Issued', value: sa?.totalItemsIssued ?? 0, sub: 'Total quantity', icon: <InventoryRoundedIcon />, color: '#059669' },
                { label: 'Departments', value: sa?.byDepartment?.length ?? 0, sub: 'With activity', icon: <CategoryRoundedIcon />, color: '#7c3aed' },
                { label: 'Avg Items / Issue', value: sa?.avgItemsPerDistribution ?? 0, sub: 'Per distribution', icon: <TrendingUpRoundedIcon />, color: '#d97706' },
              ].map((k) => (
                <Grid size={{ xs: 6, sm: 3 }} key={k.label} sx={{ display: 'flex' }}>
                  <KpiCard label={k.label} value={k.value} sub={k.sub} icon={k.icon} accentColor={k.color} loading={loadingService} />
                </Grid>
              ))}
            </Grid>

            {/* Distribution Trend Chart */}
            {(hasData || loadingService) && (
              <Card sx={{ p: 2.5, mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em', mb: 0.25 }}>Distribution Trend</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>Number of distributions over time — {periodLabel}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#4f46e5', fontSize: '1.1rem' }}>{sa?.totalDistributions ?? 0}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Items Issued</Typography>
                      <Typography variant="body1" fontWeight={700} sx={{ color: '#059669', fontSize: '1rem' }}>{sa?.totalItemsIssued ?? 0}</Typography>
                    </Box>
                  </Box>
                </Box>
                {loadingService ? (
                  <LinearProgress sx={{ borderRadius: 1, my: 4 }} />
                ) : trendData.length > 0 ? (
                  <>
                    <Box sx={{ position: 'relative', overflow: 'auto', pb: 1, mx: -1 }}>
                      <svg viewBox={`0 0 ${trendW} ${trendH}`} style={{ width: '100%', minWidth: 480, height: 196 }} preserveAspectRatio="xMinYMin meet" onMouseLeave={() => setHoveredTrend(null)}>
                        <defs>
                          <linearGradient id="distAreaGrad" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.02" />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.18" />
                          </linearGradient>
                          <linearGradient id="distLineGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#a5b4fc" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                          <filter id="distGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#818cf8" floodOpacity="0.25"/>
                          </filter>
                        </defs>
                        {/* Y grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((frac, gi) => {
                          const gy = trendPad.top + trendChartH - frac * trendChartH;
                          const val = Math.round(frac * maxTrend);
                          return (
                            <g key={gi}>
                              <line x1={trendPad.left} y1={gy} x2={trendPad.left + trendChartW} y2={gy} stroke={gi === 0 ? '#e5e7eb' : '#f3f4f6'} strokeWidth="1" />
                              <text x={trendPad.left - 8} y={gy + 4} textAnchor="end" fontSize="10" fill="#9ca3af" fontFamily="Inter, system-ui, sans-serif">{val}</text>
                            </g>
                          );
                        })}
                        <path d={trendArea} fill="url(#distAreaGrad)" />
                        <path d={trendLine} fill="none" stroke="url(#distLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#distGlow)" />
                        {trendPoints.map((p) => {
                          const isH = hoveredTrend === p.index;
                          return (
                            <g key={p.date}>
                              {isH && (
                                <>
                                  <line x1={p.x} y1={trendPad.top} x2={p.x} y2={trendPad.top + trendChartH} stroke="#c7d2fe" strokeWidth="1" strokeDasharray="3,3" />
                                  <circle cx={p.x} cy={p.y} r="10" fill="#6366f1" opacity="0.08" />
                                  <g transform={`translate(${p.x}, ${p.y - 28})`}>
                                    <rect x="-28" y="-18" width="56" height="18" rx="6" fill="#1e1b4b" opacity="0.9" />
                                    <text x="0" y="-5" textAnchor="middle" fontSize="11" fill="#e0e7ff" fontWeight={600} fontFamily="Inter, system-ui, sans-serif">{p.count} dist.</text>
                                  </g>
                                </>
                              )}
                              <circle cx={p.x} cy={p.y} r={isH ? 5.5 : 3} fill={isH ? '#6366f1' : '#fff'} stroke="#818cf8" strokeWidth={isH ? 2.5 : 2} style={{ cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={() => setHoveredTrend(p.index)} onMouseMove={() => setHoveredTrend(p.index)} />
                            </g>
                          );
                        })}
                      </svg>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: '10%', flexWrap: 'wrap', gap: 0.5 }}>
                      {trendData.map((t, i) => (
                        <Typography key={t.date} variant="caption" color={hoveredTrend === i ? 'primary.main' : 'text.secondary'} fontWeight={hoveredTrend === i ? 700 : 400} sx={{ transition: 'all 0.15s', cursor: 'pointer', fontSize: '0.68rem' }} onMouseEnter={() => setHoveredTrend(i)} onMouseLeave={() => setHoveredTrend(null)}>
                          {t.label}
                        </Typography>
                      ))}
                    </Box>
                  </>
                ) : (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No trend data available.</Typography>
                )}
              </Card>
            )}

            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              {/* Department Breakdown */}
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                <Card sx={{ p: 2.5, width: '100%' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>Department Breakdown</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.82rem' }}>Items issued per department</Typography>
                  {loadingService ? (
                    <LinearProgress sx={{ borderRadius: 1 }} />
                  ) : sa?.byDepartment?.length ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {sa.byDepartment.map((d) => {
                        const pct = Math.round((d.itemsIssued / maxDept) * 100);
                        return (
                          <Box key={d.department}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>{d.department}</Typography>
                              <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">{d.distributionCount} dist.</Typography>
                                <Typography variant="caption" fontWeight={700} sx={{ color: '#4f46e5' }}>{d.itemsIssued} items</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ position: 'relative', height: 8, bgcolor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                              <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 4, background: 'linear-gradient(90deg, #a5b4fc, #6366f1)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography color="text.secondary" sx={{ py: 2, fontSize: '0.84rem' }}>No department data for this period.</Typography>
                  )}
                </Card>
              </Grid>

              {/* Top Items */}
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                <Card sx={{ p: 2.5, width: '100%' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>Top Issued Items</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.82rem' }}>Most frequently distributed items</Typography>
                  {loadingService ? (
                    <LinearProgress sx={{ borderRadius: 1 }} />
                  ) : sa?.topItems?.length ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {sa.topItems.slice(0, 8).map((item, idx) => {
                        const pct = Math.round((item.quantity / getMaxQuantity()) * 100);
                        return (
                          <Box key={item.itemId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: idx < 3 ? '#4f46e5' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Typography variant="caption" sx={{ color: idx < 3 ? '#fff' : '#6b7280', fontWeight: 700, fontSize: '0.65rem' }}>{idx + 1}</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.84rem', maxWidth: '60%' }}>{item.itemName || '—'}</Typography>
                                <Typography variant="caption" fontWeight={700} sx={{ color: '#059669', flexShrink: 0 }}>{item.quantity} units</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ flex: 1, height: 6, bgcolor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                                  <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: 'linear-gradient(90deg, #6ee7b7, #059669)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.68rem', minWidth: 28 }}>{pct}%</Typography>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography color="text.secondary" sx={{ py: 2, fontSize: '0.84rem' }}>No item data for this period.</Typography>
                  )}
                </Card>
              </Grid>
            </Grid>

            {/* Recent Distributions Table */}
            <Card sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>Recent Distributions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.82rem' }}>Latest distribution records in this period</Typography>
              {loadingService ? (
                <LinearProgress sx={{ borderRadius: 1 }} />
              ) : sa?.recentDistributions?.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Distribution #</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Issued To</TableCell>
                        <TableCell align="right">Line Items</TableCell>
                        <TableCell align="right">Total Qty</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sa.recentDistributions.map((dist) => (
                        <TableRow key={dist.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                          <TableCell><Typography variant="body2" fontWeight={600} fontFamily="monospace" sx={{ fontSize: '0.82rem', color: '#4f46e5' }}>{dist.distributionNumber}</Typography></TableCell>
                          <TableCell><Chip label={dist.department} size="small" sx={{ bgcolor: '#ede9fe', color: '#5b21b6', fontWeight: 600, fontSize: '0.72rem', height: 20 }} /></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{dist.issuedTo ?? '—'}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2">{dist.lineCount}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" fontWeight={600} sx={{ color: '#059669' }}>{dist.itemCount}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{dist.createdAt ? new Date(dist.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : !hasData ? (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <LocalShippingRoundedIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1.5 }} />
                  <Typography color="text.secondary" fontWeight={600} sx={{ mb: 0.5 }}>No distributions for {periodLabel.toLowerCase()}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Issue items to departments from <strong>Stock Management → Issue Items</strong> to see analytics here.
                  </Typography>
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ py: 2 }}>No recent distributions.</Typography>
              )}
            </Card>
          </>
        );
      })()}

      {/* Stock */}
      {activeTab === 4 && (
        <>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 6 }} sx={{ display: 'flex' }}>
              <KpiCard label="Total Movements" value={stockByPeriod?.summary?.totalMovements ?? 0} sub="This period" icon={<TrendingUpRoundedIcon />} accentColor="#4f46e5" loading={loadingPeriod} />
            </Grid>
            <Grid size={{ xs: 6 }} sx={{ display: 'flex' }}>
              <KpiCard label="Items Affected" value={stockByPeriod?.summary?.itemsAffected ?? 0} sub="Unique items" icon={<InventoryRoundedIcon />} accentColor="#059669" loading={loadingPeriod} />
            </Grid>
          </Grid>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Stock Movement by Period</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>In and out movements per item</Typography>
            {stockByPeriod?.byItem?.length ? (
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Item name</TableCell>
                      <TableCell align="right">In</TableCell>
                      <TableCell align="right">Out</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockByPeriod.byItem.map((r) => (
                      <TableRow key={r.itemId}>
                        <TableCell><Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{r.sku}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={500}>{r.name}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight={600} sx={{ color: '#059669' }}>{r.in}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight={600} sx={{ color: '#dc2626' }}>{r.out}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2 }}>No movements for this period.</Typography>
            )}
          </Card>
        </>
      )}

      {/* Inventory */}
      {activeTab === 5 && (
        <>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {[
              { label: 'Total Items', value: inventoryReport?.summary?.totalItems ?? 0, sub: 'Products', icon: <InventoryRoundedIcon />, color: '#4f46e5' },
              { label: 'Total Units', value: inventoryReport?.summary?.totalUnits ?? 0, sub: 'In stock', icon: <CategoryRoundedIcon />, color: '#059669' },
              { label: 'Inventory Value', value: `${Number(inventoryReport?.summary?.totalInventoryValue ?? 0).toFixed(2)} ETB`, sub: 'Total value', icon: <ReceiptLongRoundedIcon />, color: '#7c3aed' },
              { label: 'Low Stock', value: inventoryReport?.summary?.lowStockCount ?? 0, sub: 'Need reorder', icon: <WarningAmberRoundedIcon />, color: (inventoryReport?.summary?.lowStockCount ?? 0) > 0 ? '#dc2626' : '#6b7280' },
            ].map((k) => (
              <Grid size={{ xs: 6, sm: 3 }} key={k.label} sx={{ display: 'flex' }}>
                <KpiCard label={k.label} value={k.value} sub={k.sub} icon={k.icon} accentColor={k.color} loading={loadingInventory} />
              </Grid>
            ))}
          </Grid>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Inventory Report</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Full stock list with reorder levels and current quantities</Typography>
            {inventoryReport?.items?.length ? (
              <TableContainer sx={{ maxHeight: 450 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Item name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Reorder</TableCell>
                      <TableCell align="right">Current</TableCell>
                      <TableCell align="right">Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventoryReport.items.map((r, i) => (
                      <TableRow key={r.sku + i}>
                        <TableCell><Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{r.sku}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={500}>{r.name}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{r.category ?? '—'}</Typography></TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell align="right">{r.reorderLevel}</TableCell>
                        <TableCell align="right">
                          <Typography component="span" fontWeight={r.currentStock <= r.reorderLevel ? 700 : undefined} sx={{ color: r.currentStock <= r.reorderLevel ? '#d97706' : undefined }}>{r.currentStock}</Typography>
                        </TableCell>
                        <TableCell align="right">{Number(r.price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2 }}>No inventory data.</Typography>
            )}
          </Card>
        </>
      )}
    </Box>
  );
}
