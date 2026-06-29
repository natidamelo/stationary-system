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
  Autocomplete,
  Chip,
  Alert,
  InputAdornment,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import RemoveRedEyeRoundedIcon from '@mui/icons-material/RemoveRedEyeRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type TransferLine = {
  itemId: string;
  quantity: number;
  item?: { name: string; sku: string };
};

type StoreTransfer = {
  id: string;
  transferNumber: string;
  fromStoreId: string;
  fromStore?: { name: string; location?: string };
  toStoreId: string;
  toStore?: { name: string; location?: string };
  status: 'pending' | 'completed';
  notes?: string;
  lines: TransferLine[];
  createdBy?: { fullName: string };
  createdAt: string;
  completedAt?: string;
};

export default function StoreTransfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<StoreTransfer[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StoreTransfer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [fromStoreId, setFromStoreId] = useState(user?.storeId || '');
  const [toStoreId, setToStoreId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ itemId: string; quantity: number }>>([
    { itemId: '', quantity: 1 },
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<StoreTransfer[]>('/store-transfers').then((r) => setTransfers(r.data)),
      api.get<any[]>('/stores').then((r) => setStores(r.data)),
      api.get<any[]>('/items').then((r) => setItems(r.data)),
    ])
      .catch((err) => console.error('Error loading transfers data', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setFromStoreId(user?.storeId || '');
    setToStoreId('');
    setNotes('');
    setLines([{ itemId: '', quantity: 1 }]);
    setError('');
    setModal(true);
  };

  const handleAddLine = () => {
    setLines([...lines, { itemId: '', quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const saveTransfer = async () => {
    if (!fromStoreId || !toStoreId) {
      setError('Please select both source and destination stores');
      return;
    }
    if (fromStoreId === toStoreId) {
      setError('Source and destination stores must be different');
      return;
    }
    const invalidLine = lines.some((l) => !l.itemId || l.quantity < 1);
    if (invalidLine) {
      setError('All lines must have a valid product and quantity greater than 0');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/store-transfers', {
        fromStoreId,
        toStoreId,
        notes,
        lines,
      });
      setModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const completeTransfer = async (id: string) => {
    if (!confirm('Are you sure you want to approve and complete this store transfer? Stock will be updated immediately.')) return;
    try {
      await api.post(`/store-transfers/${id}/complete`);
      loadData();
      if (viewModal && selectedTransfer?.id === id) {
        setViewModal(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete transfer');
    }
  };

  const openView = (t: StoreTransfer) => {
    setSelectedTransfer(t);
    setViewModal(true);
  };

  const filteredTransfers = transfers.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.transferNumber.toLowerCase().includes(q) ||
      (t.fromStore?.name || '').toLowerCase().includes(q) ||
      (t.toStore?.name || '').toLowerCase().includes(q)
    );
  });

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
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Store Transfers</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Transfer inventory stock between store locations and view transfer history.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openAdd}
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
          New Store Transfer
        </Button>
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search transfer records by number, store name, code."
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

      {/* Transfers Table */}
      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' } }}>
                <TableCell>Transfer Number</TableCell>
                <TableCell>Source Store</TableCell>
                <TableCell>Destination Store</TableCell>
                <TableCell>Items Count</TableCell>
                <TableCell>Transferred By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CompareArrowsRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                    <Typography color="text.secondary" variant="body2">No transfers logged yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransfers.map((t) => (
                  <TableRow key={t.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{t.transferNumber}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={500}>{t.fromStore?.name || '-'}</Typography>
                        {t.fromStore?.location && (
                          <Chip label={t.fromStore.location} size="small" sx={{ fontWeight: 600, fontSize: '0.65rem', bgcolor: '#e0e7ff', color: '#4f46e5' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={500}>{t.toStore?.name || '-'}</Typography>
                        {t.toStore?.location && (
                          <Chip label={t.toStore.location} size="small" sx={{ fontWeight: 600, fontSize: '0.65rem', bgcolor: '#fce7f3', color: '#db2777' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{t.lines.length} products</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        👤 {t.createdBy?.fullName || 'System'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        📅 {new Date(t.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => openView(t)}>
                          <RemoveRedEyeRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
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

      {/* New Store Transfer Dialog */}
      <Dialog
        open={modal}
        onClose={() => setModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          New Store Transfer
          <IconButton size="small" onClick={() => setModal(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                Source Store <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <option value="">Select Source Store..</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id} disabled={!s.isActive}>
                    {s.name}{s.location ? ` — ${s.location}` : ''}
                  </option>
                ))}
              </TextField>
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                Destination Store <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <option value="">Select Destination Store..</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id} disabled={!s.isActive}>
                    {s.name}{s.location ? ` — ${s.location}` : ''}
                  </option>
                ))}
              </TextField>
            </Box>
          </Box>

          {/* Notes */}
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Notes / Reason for Transfer</Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            placeholder="Specify the reason or additional details about this transfer.."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          {/* Transfer Items */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              Transfer Items <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" startIcon={<QrCodeScannerIcon />} sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                Scan Item
              </Button>
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={handleAddLine} sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                Add Line
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                  <TableCell>Product</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>Transfer Qty</TableCell>
                  <TableCell align="center" sx={{ width: 60 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Autocomplete
                        options={items}
                        getOptionLabel={(option) => `${option.name} (${option.sku})`}
                        renderInput={(params) => <TextField {...params} placeholder="Select Product.." size="small" />}
                        value={items.find((i) => i.id === line.itemId) || null}
                        onChange={(_, newValue) => handleLineChange(index, 'itemId', newValue?.id || '')}
                        size="small"
                        sx={{ minWidth: 200 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={lines.length === 1}
                        onClick={() => handleRemoveLine(index)}
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={saveTransfer}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
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
            Complete Store Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Transfer Details Dialog */}
      <Dialog
        open={viewModal}
        onClose={() => setViewModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedTransfer && (
          <>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              Transfer Details — {selectedTransfer.transferNumber}
              <IconButton size="small" onClick={() => setViewModal(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', gap: 4, mb: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Source Store</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedTransfer.fromStore?.name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Destination Store</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedTransfer.toStore?.name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box>
                    <Chip
                      label={selectedTransfer.status === 'completed' ? 'Completed' : 'Pending'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        mt: 0.25,
                        bgcolor: selectedTransfer.status === 'completed' ? '#dcfce7' : '#fef9c3',
                        color: selectedTransfer.status === 'completed' ? '#16a34a' : '#ca8a04',
                      }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Transferred By</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedTransfer.createdBy?.fullName || 'System'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(selectedTransfer.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </Typography>
                </Box>
              </Box>

              {selectedTransfer.notes && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary">Notes</Typography>
                  <Typography variant="body2" sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', mt: 0.5 }}>
                    {selectedTransfer.notes}
                  </Typography>
                </Box>
              )}

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                      <TableCell>Item Name</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Qty Transferred</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTransfer.lines.map((l, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 500 }}>{l.item?.name || 'Unknown Item'}</TableCell>
                        <TableCell>{l.item?.sku || '-'}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={l.quantity}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: '0.75rem', bgcolor: '#dcfce7', color: '#16a34a' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={() => setViewModal(false)} variant="outlined" sx={{ textTransform: 'none', borderRadius: 2 }}>
                Close
              </Button>
              {selectedTransfer.status === 'pending' && ['admin', 'manager'].includes(user?.role || '') && (
                <Button
                  onClick={() => completeTransfer(selectedTransfer.id)}
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleRoundedIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Approve & Complete
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
