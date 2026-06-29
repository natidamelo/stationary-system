import { useEffect, useState } from 'react';
import { typography } from '../theme/typography';
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
import RemoveRedEyeRoundedIcon from '@mui/icons-material/RemoveRedEyeRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { api } from '../api/client';

type IssueLine = {
  itemId: string;
  quantity: number;
  item?: { name: string; sku: string };
};

type Distribution = {
  id: string;
  distributionNumber: string;
  issuedToUserId?: string;
  issuedToUser?: { id: string; fullName: string };
  storeId?: string;
  store?: { id: string; name: string; location?: string };
  issuedById?: string;
  issuedBy?: { id: string; fullName: string };
  department?: string;
  notes?: string;
  lines: IssueLine[];
  createdAt: string;
};

export default function ItemIssues() {
  const [issues, setIssues] = useState<Distribution[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Distribution | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [storeId, setStoreId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ itemId: string; quantity: number }>>([
    { itemId: '', quantity: 1 },
  ]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<Distribution[]>('/distribution').then((r) => setIssues(r.data)),
      api.get<any[]>('/stores').then((r) => setStores(r.data)),
      api.get<any[]>('/items').then((r) => setItems(r.data)),
    ])
      .catch((err) => console.error('Error loading item issues data', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setStoreId('');
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

  const getAvailableStock = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    return item?.currentStock ?? item?.quantity ?? 0;
  };

  const saveIssue = async () => {
    if (!storeId) {
      setError('Please select a destination store');
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
      await api.post('/distribution/issue', {
        storeId,
        notes,
        lines,
      });
      setModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to issue items');
    } finally {
      setSubmitting(false);
    }
  };

  const openView = (d: Distribution) => {
    setSelectedIssue(d);
    setViewModal(true);
  };

  const filteredIssues = issues.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.distributionNumber.toLowerCase().includes(q) ||
      (d.store?.name || '').toLowerCase().includes(q) ||
      (d.issuedToUser?.fullName || '').toLowerCase().includes(q)
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
          <Typography variant="h5" fontWeight={typography.fontWeightBold} sx={{ letterSpacing: typography.pageTitle.letterSpacing }}>Item Issues</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Issue inventory stock to registered store locations and log distribution trails.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openAdd}
          sx={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            textTransform: 'none',
            fontWeight: typography.fontWeightSemiBold,
            borderRadius: 2,
            px: 3,
            py: 1,
            '&:hover': { background: 'linear-gradient(135deg, #4338ca, #6d28d9)' },
          }}
        >
          Issue Items
        </Button>
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search issue records by number, store name, code."
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

      {/* Issues Table */}
      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: typography.fontWeightBold, fontSize: typography.fontSizeXs, textTransform: 'uppercase', letterSpacing: typography.label.letterSpacing, color: 'text.secondary' } }}>
                <TableCell>Issue Number</TableCell>
                <TableCell>Destination Store</TableCell>
                <TableCell>Items Count</TableCell>
                <TableCell>Issued By</TableCell>
                <TableCell>Fulfillment Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredIssues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <AssignmentTurnedInRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                    <Typography color="text.secondary" variant="body2">No items issued yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredIssues.map((d) => (
                  <TableRow key={d.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{d.distributionNumber}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={500}>{d.store?.name || d.issuedToUser?.fullName || '-'}</Typography>
                        {d.store && (
                          <Chip
                            label={d.store.location || 'Store'}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: '0.65rem', bgcolor: '#e0e7ff', color: '#4f46e5' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{d.lines.length} products</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        👤 {d.issuedBy?.fullName || d.issuedToUser?.fullName || 'System'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        📅 {new Date(d.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => openView(d)}>
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

      {/* Issue Items to Store Dialog */}
      <Dialog
        open={modal}
        onClose={() => setModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Issue Items to Store
          <IconButton size="small" onClick={() => setModal(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Destination Store <span style={{ color: '#ef4444' }}>*</span>
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            <option value="">Select Destination Store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.location ? ` — ${s.location}` : ''}
              </option>
            ))}
          </TextField>

          {/* Products to Issue */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={typography.fontWeightBold} sx={{ textTransform: 'uppercase', fontSize: typography.fontSizeXs, letterSpacing: typography.label.letterSpacing }}>
              Products to Issue
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" startIcon={<QrCodeScannerIcon />} sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                Scan Item
              </Button>
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={handleAddLine} sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                Add Item
              </Button>
            </Box>
          </Box>

          {lines.map((line, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                {index === 0 && (
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', color: 'text.secondary' }}>
                    Product <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                )}
                <Autocomplete
                  options={items}
                  getOptionLabel={(option) => `${option.name} (${option.sku})`}
                  renderInput={(params) => <TextField {...params} placeholder="Select Product" size="small" />}
                  value={items.find((i) => i.id === line.itemId) || null}
                  onChange={(_, newValue) => handleLineChange(index, 'itemId', newValue?.id || '')}
                  size="small"
                />
              </Box>
              <Box sx={{ width: 80 }}>
                {index === 0 && (
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', color: 'text.secondary' }}>
                    Available
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, bgcolor: '#f1f5f9', borderRadius: 1, px: 1 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    {line.itemId ? `${getAvailableStock(line.itemId)} units` : '0 units'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ width: 70 }}>
                {index === 0 && (
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', color: 'text.secondary' }}>
                    Qty <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                )}
                <TextField
                  type="number"
                  size="small"
                  value={line.quantity}
                  onChange={(e) => handleLineChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                  inputProps={{ min: 1 }}
                />
              </Box>
              <Box sx={{ pt: index === 0 ? 2.5 : 0 }}>
                <IconButton
                  size="small"
                  color="default"
                  disabled={lines.length === 1}
                  onClick={() => handleRemoveLine(index)}
                >
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}

          {/* Issuance Notes */}
          <Typography variant="body2" fontWeight={600} sx={{ mt: 2, mb: 0.5 }}>Issuance Notes</Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            placeholder="Reason for issuance, department reference, or logistics notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={saveIssue}
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
            Issue Items
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Issue Details Dialog */}
      <Dialog
        open={viewModal}
        onClose={() => setViewModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedIssue && (
          <>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              Issue Details — {selectedIssue.distributionNumber}
              <IconButton size="small" onClick={() => setViewModal(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', gap: 4, mb: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Destination Store</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedIssue.store?.name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Issued By</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedIssue.issuedBy?.fullName || selectedIssue.issuedToUser?.fullName || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Date Issued</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(selectedIssue.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </Typography>
                </Box>
              </Box>

              {selectedIssue.notes && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary">Issuance Notes</Typography>
                  <Typography variant="body2" sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', mt: 0.5 }}>
                    {selectedIssue.notes}
                  </Typography>
                </Box>
              )}

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                      <TableCell>Item Name</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Qty Issued</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedIssue.lines.map((l, index) => (
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
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
