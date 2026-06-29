import { useEffect, useState, useMemo } from 'react';
import { typography } from '../theme/typography';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
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
  Chip,
  CircularProgress,
  Tooltip,
  InputAdornment,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CallReceivedRoundedIcon from '@mui/icons-material/CallReceivedRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type PO = {
  id: string;
  poNumber: string;
  status: string;
  orderDate: string;
  expectedDate?: string;
  supplier: { id: string; name: string };
  lines: Array<{ id: string; quantity: number; receivedQuantity: number; item: { name: string; sku: string }; unitPrice: number }>;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  saleNumber?: string;
  issueDate: string;
  customerName?: string;
  lines: Array<{ description: string; sku?: string; quantity: number; unitPrice: number; total: number }>;
  totalAmount: number;
  status: string;
};

type UnifiedOrder = {
  id: string;
  orderNumber: string;
  type: 'PURCHASE' | 'SALE';
  status: string;
  partner: string;
  itemsCount: number;
  totalAmount: number;
  date: string;
  raw: any;
};

const canManage = (role: string) => ['admin', 'manager', 'inventory_clerk'].includes(role);

export default function PurchaseOrders() {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string; sku: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PURCHASE' | 'SALE' | 'PENDING'>('ALL');
  
  // Dialogs
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ supplierId: '', expectedDate: '', lines: [{ itemId: '', quantity: 1, unitPrice: 0 }], notes: '' });
  const [receiveModal, setReceiveModal] = useState<PO | null>(null);
  const [receiveLines, setReceiveLines] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Details view dialog
  const [detailsOrder, setDetailsOrder] = useState<UnifiedOrder | null>(null);

  const load = () => {
    Promise.all([
      api.get<PO[]>('/purchase-orders').then((r) => r.data),
      api.get<Invoice[]>('/invoices').then((r) => r.data),
    ]).then(([pos, invs]) => {
      setPurchaseOrders(pos);
      setInvoices(invs);
    }).catch((err) => console.error("Error reloading orders:", err));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<PO[]>('/purchase-orders').then((r) => r.data),
      api.get<Invoice[]>('/invoices').then((r) => r.data),
      api.get<Array<{ id: string; name: string }>>('/suppliers').then((r) => r.data),
      api.get<Array<{ id: string; name: string; sku: string }>>('/items').then((r) => r.data),
    ]).then(([pos, invs, sups, itemsData]) => {
      setPurchaseOrders(pos);
      setInvoices(invs);
      setSuppliers(sups);
      setItems(itemsData);
    }).catch((err) => console.error("Error loading orders data:", err))
      .finally(() => setLoading(false));
  }, []);

  const createPo = async () => {
    if (!form.supplierId) {
      setCreateError('Please select a supplier');
      return;
    }
    
    const validLines = form.lines.filter((l) => l.itemId && l.quantity > 0 && l.unitPrice >= 0);
    if (validLines.length === 0) {
      setCreateError('Please add at least one line item with valid quantity and price');
      return;
    }

    setSubmitting(true);
    setCreateError(null);
    
    try {
      const payload = {
        supplierId: form.supplierId,
        expectedDate: form.expectedDate || undefined,
        lines: validLines,
        notes: form.notes || undefined,
      };
      await api.post('/purchase-orders', payload);
      setModal(false);
      setForm({ supplierId: '', expectedDate: '', lines: [{ itemId: '', quantity: 1, unitPrice: 0 }], notes: '' });
      setCreateError(null);
      load();
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      let errorMessage = 'Failed to create purchase order';
      if (error.response?.data) {
        const data = error.response.data;
        if (data.message) {
          if (Array.isArray(data.message)) {
            errorMessage = data.message.join(', ');
          } else if (typeof data.message === 'string') {
            errorMessage = data.message;
          }
        }
      }
      setCreateError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const sendPo = async (id: string) => {
    await api.post(`/purchase-orders/${id}/send`);
    load();
  };

  const openReceive = (po: PO) => {
    setReceiveModal(po);
    const init: Record<string, number> = {};
    po.lines.forEach((l) => { init[l.id] = Number(l.receivedQuantity) || 0; });
    setReceiveLines(init);
  };

  const submitReceive = async () => {
    if (!receiveModal) return;
    await api.post(`/purchase-orders/${receiveModal.id}/receive`, {
      lines: Object.entries(receiveLines).map(([lineId, receivedQuantity]) => ({ lineId, receivedQuantity })),
    });
    setReceiveModal(null);
    load();
  };

  const closePo = async (id: string) => {
    await api.post(`/purchase-orders/${id}/close`);
    load();
  };

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { itemId: '', quantity: 1, unitPrice: 0 }] }));

  // Map POs and Invoices to a single unified list
  const unifiedOrders = useMemo(() => {
    const orders: UnifiedOrder[] = [];

    // Map Purchase Orders
    purchaseOrders.forEach((po) => {
      const itemsCount = po.lines.reduce((sum, l) => sum + l.quantity, 0);
      const totalAmount = po.lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
      orders.push({
        id: po.id,
        orderNumber: po.poNumber,
        type: 'PURCHASE',
        status: po.status,
        partner: po.supplier?.name || '—',
        itemsCount,
        totalAmount,
        date: po.orderDate || po.poNumber,
        raw: po,
      });
    });

    // Map Invoices (Sales)
    invoices.forEach((inv) => {
      const itemsCount = inv.lines.reduce((sum, l) => sum + l.quantity, 0);
      orders.push({
        id: inv.id,
        orderNumber: inv.invoiceNumber,
        type: 'SALE',
        status: inv.status === 'paid' ? 'delivered' : 'pending',
        partner: inv.customerName || 'Walk-in Customer',
        itemsCount,
        totalAmount: inv.totalAmount,
        date: inv.issueDate,
        raw: inv,
      });
    });

    // Sort by date descending
    return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchaseOrders, invoices]);

  // Filter orders by active tab and search query
  const filteredOrders = useMemo(() => {
    return unifiedOrders.filter((ord) => {
      // Filter by active tab
      if (activeTab === 'PURCHASE' && ord.type !== 'PURCHASE') return false;
      if (activeTab === 'SALE' && ord.type !== 'SALE') return false;
      if (activeTab === 'PENDING') {
        const isPending = ord.status.toLowerCase() === 'pending' || 
                          ord.status.toLowerCase() === 'draft' || 
                          ord.status.toLowerCase() === 'sent';
        if (!isPending) return false;
      }

      // Filter by search query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.partner.toLowerCase().includes(q)
      );
    });
  }, [unifiedOrders, activeTab, searchQuery]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={36} thickness={4} sx={{ color: '#4f46e5' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={typography.fontWeightBold} sx={{ letterSpacing: typography.pageTitle.letterSpacing }}>Orders</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Manage procurement purchase orders and customer sales fulfillments.
          </Typography>
        </Box>
        {canManage(user?.role ?? '') && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setModal(true)}>
            New Order
          </Button>
        )}
      </Box>

      {/* Tabs and Search row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['ALL', 'PURCHASE', 'SALE', 'PENDING'] as const).map((tab) => (
            <Chip
              key={tab}
              label={tab}
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? 'filled' : 'outlined'}
              sx={{
                fontWeight: typography.fontWeightBold,
                fontSize: typography.fontSizeXs,
                letterSpacing: typography.button.letterSpacing,
                px: 0.5,
                ...(activeTab === tab
                  ? { bgcolor: '#4f46e5', color: '#fff', borderColor: '#4f46e5' }
                  : { borderColor: '#e2e8f0', color: 'text.secondary', '&:hover': { bgcolor: '#f1f5f9' } }),
              }}
            />
          ))}
        </Box>

        <TextField
          placeholder="Search by order number or partner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ 
            minWidth: 280,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              backgroundColor: 'background.paper',
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ORDER #</TableCell>
                <TableCell>TYPE</TableCell>
                <TableCell>STATUS</TableCell>
                <TableCell>PARTNER / CUSTOMER</TableCell>
                <TableCell align="right">ITEMS COUNT</TableCell>
                <TableCell align="right">TOTAL AMOUNT</TableCell>
                <TableCell>CREATED DATE</TableCell>
                <TableCell align="right">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((ord) => {
                const isPurchase = ord.type === 'PURCHASE';
                const statusStyle = ord.status === 'delivered' || ord.status === 'received' || ord.status === 'paid'
                  ? { bg: '#ecfdf5', color: '#059669' }
                  : ord.status === 'pending' || ord.status === 'draft' || ord.status === 'sent'
                  ? { bg: '#fffbeb', color: '#d97706' }
                  : { bg: '#f3f4f6', color: '#6b7280' };

                return (
                  <TableRow key={ord.id + ord.type} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={typography.fontWeightBold} fontFamily={typography.fontFamilyMono} sx={{ fontSize: typography.mono.fontSize, color: '#4f46e5' }}>
                        {ord.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ord.type}
                        size="small"
                        sx={{
                          bgcolor: isPurchase ? '#f5f3ff' : '#ecfdf5',
                          color: isPurchase ? '#7c3aed' : '#059669',
                          fontWeight: typography.fontWeightExtraBold,
                          fontSize: typography.fontSizeXs,
                          borderRadius: '6px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ord.status.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          borderRadius: '6px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>
                        {ord.partner}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {ord.itemsCount} items
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#4f46e5' }}>
                        ETB {Number(ord.totalAmount).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(ord.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => setDetailsOrder(ord)} color="primary">
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {isPurchase && canManage(user?.role ?? '') && (
                          <>
                            {ord.status === 'draft' && (
                              <Button size="small" variant="contained" startIcon={<SendRoundedIcon sx={{ fontSize: '0.8rem !important' }} />} onClick={() => sendPo(ord.id)} sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>
                                Send
                              </Button>
                            )}
                            {(ord.status === 'sent' || ord.status === 'received') && (
                              <Button size="small" variant="outlined" startIcon={<CallReceivedRoundedIcon sx={{ fontSize: '0.8rem !important' }} />} onClick={() => openReceive(ord.raw)} sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>
                                Receive
                              </Button>
                            )}
                            {ord.status !== 'closed' && ord.status !== 'draft' && (
                              <Button size="small" sx={{ color: 'text.secondary', py: 0.5, px: 1, fontSize: '0.75rem' }} onClick={() => closePo(ord.id)}>
                                Close
                              </Button>
                            )}
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">No orders found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!detailsOrder} onClose={() => setDetailsOrder(null)} maxWidth="sm" fullWidth>
        {detailsOrder && (
          <>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Order Details - {detailsOrder.orderNumber}</span>
              <Chip
                label={detailsOrder.type}
                size="small"
                sx={{
                  bgcolor: detailsOrder.type === 'PURCHASE' ? '#f5f3ff' : '#ecfdf5',
                  color: detailsOrder.type === 'PURCHASE' ? '#7c3aed' : '#059669',
                  fontWeight: 800,
                  fontSize: '0.68rem',
                }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>PARTNER / CUSTOMER</Typography>
                  <Typography variant="body1" fontWeight={700}>{detailsOrder.partner}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>ORDER DATE</Typography>
                  <Typography variant="body2">{new Date(detailsOrder.date).toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>STATUS</Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <Chip label={detailsOrder.status.toUpperCase()} size="small" color="primary" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                  </Box>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Typography variant="subtitle2" fontWeight={700}>ORDERED ITEMS</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item Description</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailsOrder.type === 'PURCHASE'
                        ? detailsOrder.raw.lines.map((line: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{line.item?.sku} - {line.item?.name}</TableCell>
                              <TableCell align="right">{line.quantity}</TableCell>
                              <TableCell align="right">ETB {Number(line.unitPrice).toFixed(2)}</TableCell>
                              <TableCell align="right">ETB {Number(line.quantity * line.unitPrice).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        : detailsOrder.raw.lines.map((line: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{line.sku} - {line.description}</TableCell>
                              <TableCell align="right">{line.quantity}</TableCell>
                              <TableCell align="right">ETB {Number(line.unitPrice).toFixed(2)}</TableCell>
                              <TableCell align="right">ETB {Number(line.total).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>TOTAL AMOUNT</Typography>
                    <Typography variant="h6" fontWeight={800} color="primary">
                      ETB {Number(detailsOrder.totalAmount).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setDetailsOrder(null)} variant="outlined">Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>      {/* Create PO Dialog */}
      <Dialog open={modal} onClose={() => { if (!submitting) { setModal(false); setCreateError(null); } }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Create New Order
          <IconButton onClick={() => { if (!submitting) { setModal(false); setCreateError(null); } }} disabled={submitting}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {createError && (
            <Typography color="error" variant="body2" sx={{ bgcolor: '#fee', p: 1.5, borderRadius: 1.5, mb: 2 }}>
              {createError}
            </Typography>
          )}
          
          {/* Order Type and Expected Date */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Order Type *</Typography>
              <FormControl fullWidth size="small">
                <Select value="purchase" disabled>
                  <MenuItem value="purchase">Purchase Order (Restock)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Expected Delivery/Fulfillment Date</Typography>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={form.expectedDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>

          {/* Supplier */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Supplier *</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={form.supplierId}
                onChange={(e) => { setForm((f) => ({ ...f, supplierId: e.target.value })); setCreateError(null); }}
                displayEmpty
              >
                <MenuItem value="" disabled>Select Supplier</MenuItem>
                {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* Requisition Items Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>ORDER ITEMS</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={addLine}
              sx={{ textTransform: 'none', borderRadius: 2, borderColor: 'divider', color: 'text.primary' }}
            >
              Add Item
            </Button>
          </Box>

          {/* Items Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>PRODUCT *</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Qty *</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Price ($) *</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>TOTAL</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.lines.map((line, idx) => {
                  const subtotal = line.quantity * (line.unitPrice || 0);

                  return (
                    <TableRow key={idx}>
                      <TableCell sx={{ py: 1, minWidth: 200 }}>
                        <Select
                          size="small"
                          fullWidth
                          value={line.itemId}
                          onChange={(e) => setForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, itemId: e.target.value } : l) }))}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>Select Product</MenuItem>
                          {items.map((i) => (
                            <MenuItem key={i.id} value={i.id}>
                              {i.name} ({i.sku})
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>
                        <TextField
                          type="number"
                          size="small"
                          value={line.quantity}
                          onChange={(e) => setForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } : l) }))}
                          inputProps={{ min: 1, style: { textAlign: 'center' } }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <TextField
                          type="number"
                          size="small"
                          value={line.unitPrice || 0}
                          onChange={(e) => setForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, unitPrice: Math.max(0, parseFloat(e.target.value) || 0) } : l) }))}
                          inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1, fontWeight: 600 }}>
                        ETB {subtotal.toFixed(2)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>
                        <IconButton
                          color="error"
                          disabled={form.lines.length === 1}
                          onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Notes */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Notes / Instructions</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Special notes or logistics instructions..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Amount Due</Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main">
              ETB {form.lines.reduce((sum, l) => sum + l.quantity * (l.unitPrice || 0), 0).toFixed(2)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={createPo}
            disabled={submitting}
            sx={{ px: 4, py: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {submitting ? 'Submitting...' : 'Submit Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={!!receiveModal} onClose={() => setReceiveModal(null)} maxWidth="sm" fullWidth>
        {receiveModal && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>Receive – {receiveModal.poNumber}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                {receiveModal.lines.map((line) => (
                  <Box key={line.id}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>{line.item?.sku} – {line.item?.name}</Typography>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      label="Received quantity"
                      inputProps={{ min: 0, max: line.quantity }}
                      value={receiveLines[line.id] ?? 0}
                      onChange={(e) => setReceiveLines((r) => ({ ...r, [line.id]: Number(e.target.value) }))}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                      {line.quantity} ordered
                    </Typography>
                  </Box>
                ))}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setReceiveModal(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
              <Button variant="contained" onClick={submitReceive}>Save</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
