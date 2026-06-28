import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  InputAdornment,
} from '@mui/material';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AssignmentReturnedRoundedIcon from '@mui/icons-material/AssignmentReturnedRounded';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../api/client';

type POLine = {
  id: string;
  itemId: string;
  item?: { name: string; sku: string };
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplier?: { name: string };
  status: 'draft' | 'sent' | 'received' | 'closed';
  orderDate: string;
  lines: POLine[];
};

export default function GoodsReceiving() {
  const [allOrders, setAllOrders] = useState<PurchaseOrder[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selectedOrderIdToReceive, setSelectedOrderIdToReceive] = useState('');
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsOrder, setDetailsOrder] = useState<PurchaseOrder | null>(null);

  const selectedPOToReceive = allOrders.find((o) => o.id === selectedOrderIdToReceive);

  const loadData = () => {
    setLoading(true);
    api.get<PurchaseOrder[]>('/purchase-orders')
      .then((r) => {
        setAllOrders(r.data);
        const logs = r.data.filter((po) => po.status === 'received' || po.status === 'closed');
        setOrders(logs);
      })
      .catch((err) => console.error('Error loading POs for goods receiving', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPOToReceive) {
      const initialQty: Record<string, number> = {};
      selectedPOToReceive.lines.forEach((l) => {
        initialQty[l.id] = l.quantity;
      });
      setReceivedQuantities(initialQty);
    } else {
      setReceivedQuantities({});
    }
  }, [selectedOrderIdToReceive, allOrders]);

  const handleQtyChange = (lineId: string, val: number) => {
    setReceivedQuantities({
      ...receivedQuantities,
      [lineId]: val,
    });
  };

  const saveReceiving = async () => {
    if (!selectedPOToReceive) return;
    
    // Validate quantities
    const invalid = selectedPOToReceive.lines.some((l) => {
      const val = receivedQuantities[l.id] ?? l.quantity;
      return val < l.receivedQuantity || val > l.quantity;
    });

    if (invalid) {
      setError('Received quantity cannot be less than already received or exceed ordered quantity');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payloadLines = selectedPOToReceive.lines.map((l) => {
        const qty = receivedQuantities[l.id] ?? l.quantity;
        return {
          lineId: l.id,
          receivedQuantity: qty,
        };
      });
      await api.post(`/purchase-orders/${selectedPOToReceive.id}/receive`, {
        lines: payloadLines,
      });
      setModal(false);
      setSelectedOrderIdToReceive('');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record received goods');
    } finally {
      setSubmitting(false);
    }
  };

  const undeliveredPOs = allOrders.filter((po) => po.status === 'sent');

  const filteredOrders = orders.filter((po) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(q) ||
      (po.supplier?.name || '').toLowerCase().includes(q)
    );
  });

  const getTotalValue = (po: PurchaseOrder) =>
    po.lines.reduce((sum, l) => sum + (l.unitPrice || 0) * l.quantity, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={36} thickness={4} sx={{ color: '#4f46e5' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Goods Receiving</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Process incoming supplier deliveries and log received warehouse stocks.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<LocalShippingRoundedIcon />}
          onClick={() => { setModal(true); setSelectedOrderIdToReceive(''); setError(''); }}
          sx={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
            py: 1,
            '&:hover': { background: 'linear-gradient(135deg, #4338ca, #6d28d9)' },
          }}
        >
          Log Received Goods
        </Button>
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search goods receiving logs by PO number or supplier name."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
      />

      {/* Logs Table */}
      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' } }}>
                <TableCell>PO Number</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Items Count</TableCell>
                <TableCell>Fulfillment Date</TableCell>
                <TableCell>Total Value</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <LocalShippingRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                    <Typography color="text.secondary" variant="body2">No goods receiving logs found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((po) => (
                  <TableRow key={po.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{po.poNumber}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{po.supplier?.name || '-'}</TableCell>
                    <TableCell>{po.lines.length} products</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        📅 {new Date(po.orderDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      ETB {getTotalValue(po).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={po.status === 'received' ? 'Received' : 'Closed'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          bgcolor: po.status === 'received' ? '#dcfce7' : '#e0e7ff',
                          color: po.status === 'received' ? '#16a34a' : '#4f46e5',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => setDetailsOrder(po)}>
                          <VisibilityIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Log Received Goods Dialog */}
      <Dialog
        open={modal}
        onClose={() => { setModal(false); setSelectedOrderIdToReceive(''); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Log Received Supplier Goods
          <IconButton size="small" onClick={() => { setModal(false); setSelectedOrderIdToReceive(''); }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Purchase Order (PO) <span style={{ color: '#ef4444' }}>*</span>
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={selectedOrderIdToReceive}
            onChange={(e) => setSelectedOrderIdToReceive(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            <option value="">Select undelivered purchase order...</option>
            {undeliveredPOs.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {po.supplier?.name || 'Unknown Supplier'} ({po.lines.length} items)
              </option>
            ))}
          </TextField>

          {selectedPOToReceive && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Supplier: <strong>{selectedPOToReceive.supplier?.name}</strong> · {selectedPOToReceive.lines.length} item(s)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Ordered</TableCell>
                      <TableCell align="right">Already Received</TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>Receive Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPOToReceive.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell sx={{ fontWeight: 500 }}>{l.item?.name || 'Unknown'}</TableCell>
                        <TableCell align="right">{l.quantity}</TableCell>
                        <TableCell align="right">{l.receivedQuantity}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={receivedQuantities[l.id] ?? l.quantity}
                            onChange={(e) => handleQtyChange(l.id, parseInt(e.target.value, 10) || 0)}
                            inputProps={{ min: l.receivedQuantity, max: l.quantity }}
                            sx={{ width: 90 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={saveReceiving}
            variant="contained"
            disabled={submitting || !selectedPOToReceive}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircleRoundedIcon />}
            sx={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              '&:hover': { background: 'linear-gradient(135deg, #4338ca, #6d28d9)' },
              '&.Mui-disabled': { background: '#e5e7eb', color: '#9ca3af' },
            }}
          >
            Fulfill & Receive Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Received Goods Details Dialog */}
      <Dialog
        open={!!detailsOrder}
        onClose={() => setDetailsOrder(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {detailsOrder && (
          <>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              Received Goods — {detailsOrder.poNumber}
              <IconButton size="small" onClick={() => setDetailsOrder(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Supplier</Typography>
                  <Typography variant="body2" fontWeight={600}>{detailsOrder.supplier?.name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Order Date</Typography>
                  <Typography variant="body2" fontWeight={600}>{new Date(detailsOrder.orderDate).toLocaleDateString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip
                    label={detailsOrder.status === 'received' ? 'Received' : 'Closed'}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      mt: 0.25,
                      bgcolor: detailsOrder.status === 'received' ? '#dcfce7' : '#e0e7ff',
                      color: detailsOrder.status === 'received' ? '#16a34a' : '#4f46e5',
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Value</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ETB {getTotalValue(detailsOrder).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                      <TableCell>Item Name</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Ordered Qty</TableCell>
                      <TableCell align="right">Received Qty</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Line Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailsOrder.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell sx={{ fontWeight: 500 }}>{l.item?.name || 'Unknown'}</TableCell>
                        <TableCell>{l.item?.sku || '-'}</TableCell>
                        <TableCell align="right">{l.quantity}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={l.receivedQuantity}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              bgcolor: l.receivedQuantity >= l.quantity ? '#dcfce7' : '#fef9c3',
                              color: l.receivedQuantity >= l.quantity ? '#16a34a' : '#ca8a04',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">ETB {(l.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          ETB {((l.unitPrice || 0) * l.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={() => setDetailsOrder(null)} variant="outlined" sx={{ textTransform: 'none', borderRadius: 2 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

