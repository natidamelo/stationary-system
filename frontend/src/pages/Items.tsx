import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
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
} from '@mui/material';
import { 
  Print as PrintIcon,
  QrCodeScanner as QrCodeScannerIcon 
} from '@mui/icons-material';
import JsBarcode from 'jsbarcode';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BarcodeScannerDialog from '../components/BarcodeScannerDialog';
import { InputAdornment } from '@mui/material';

type Item = {
  id: string;
  sku: string;
  name: string;
  category?: { id: string; name: string };
  unit: string;
  reorderLevel: number;
  price: number;
  costPrice?: number;
  imageUrl?: string;
  barcode?: string;
  isActive: boolean;
};

const canEdit = (role: string) => ['admin', 'manager', 'inventory_clerk'].includes(role);

export default function Items() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState({ sku: '', name: '', categoryId: '', unit: 'unit', reorderLevel: 0, price: 0, costPrice: 0, barcode: '', imageUrl: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printDialog, setPrintDialog] = useState(false);
  const [printCount, setPrintCount] = useState(20);
  const [itemToPrint, setItemToPrint] = useState<Item | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.name.toLowerCase()]: c.id, [c.id]: c.id }), {} as Record<string, string>);
      const res = await api.post('/items/bulk-import', { csv: text, categoryMap });
      alert(`Successfully imported/updated ${res.data.imported} items.\nErrors: ${res.data.errors.length}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Import failed');
      setLoading(false);
    } finally {
      e.target.value = '';
    }
  };
  const printBarcode = (item: Item, count: number = 20) => {
    const barcode = item.barcode || item.sku;
    const canvas = document.createElement('canvas');

    try {
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: 2.5, // High-performance width for mobile scanners
        height: 60,  // High-performance height for mobile scanners
        displayValue: true,
        fontSize: 12,
        margin: 10,
      });

      const labelHtml = `
        <div class="label">
          <div class="item-name">${item.name}</div>
          <div class="item-sku">SKU: ${item.sku}</div>
          <img class="barcode-img" src="${canvas.toDataURL()}" alt="Barcode" />
        </div>`;

      const labelsHtml = Array(count).fill(labelHtml).join('');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print barcodes');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Barcode - ${item.name}</title>
            <style>
              @media print {
                @page {
                  margin: 5mm;
                  size: A4 portrait;
                }
                body { margin: 0; padding: 0; }
              }
              * { box-sizing: border-box; }
              body {
                font-family: Arial, sans-serif;
                background: #fff;
                margin: 0;
                padding: 4mm;
              }
              .grid {
                display: flex;
                flex-wrap: wrap;
                gap: 2mm;
                justify-content: flex-start;
              }
              .label {
                width: 50mm;
                height: 25mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 1mm 1.5mm;
                border: 0.3mm solid #999;
                page-break-inside: avoid;
                overflow: hidden;
              }
              .item-name {
                font-size: 5.5pt;
                font-weight: bold;
                line-height: 1.2;
                max-width: 47mm;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                margin-bottom: 0.3mm;
              }
              .item-sku {
                font-size: 5pt;
                color: #444;
                margin-bottom: 0.3mm;
              }
              .barcode-img {
                max-width: 90%;
                height: auto;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: pixelated; /* Ensure crisp bars */
              }
            </style>
          </head>
          <body>
            <div class="grid">
              ${labelsHtml}
            </div>
            <script>
              window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating barcode:', error);
      alert('Error generating barcode. Please try again.');
    }
  };

  const handleOpenPrintDialog = (item: Item) => {
    setItemToPrint(item);
    setPrintCount(20);
    setPrintDialog(true);
  };

  const handleDoPrint = () => {
    if (itemToPrint) {
      printBarcode(itemToPrint, printCount);
      setPrintDialog(false);
    }
  };

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('categoryId', categoryId);
    api.get<Item[]>(`/items?${params}`).then((r) => setItems(r.data));
  };

  useEffect(() => {
    Promise.all([
      api.get<Item[]>('/items').then((r) => setItems(r.data)),
      api.get<Array<{ id: string; name: string }>>('/categories').then((r) => setCategories(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setForm({ sku: '', name: '', categoryId: '', unit: 'unit', reorderLevel: 0, price: 0, costPrice: 0, barcode: '', imageUrl: '' });
    setEditingId(null);
    setModal('add');
  };

  const openEdit = (i: Item) => {
    setForm({
      sku: i.sku,
      name: i.name,
      categoryId: i.category?.id || '',
      unit: i.unit,
      reorderLevel: i.reorderLevel,
      price: i.price,
      costPrice: i.costPrice ?? 0,
      barcode: i.barcode ?? i.sku,
      imageUrl: i.imageUrl ?? '',
    });
    setEditingId(i.id);
    setModal('edit');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const payload = {
      ...form,
      categoryId: form.categoryId || undefined,
      reorderLevel: Number(form.reorderLevel),
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      barcode: form.barcode || form.sku, // Use SKU as fallback if barcode not provided
      imageUrl: form.imageUrl || undefined,
    };
    if (editingId) {
      await api.put(`/items/${editingId}`, payload);
    } else {
      await api.post('/items', payload);
    }
    setModal(null);
    load();
  };

  const handleDeleteItem = (item: Item) => {
    console.log('[Items] Opening delete modal for:', item);
    setItemToDelete(item);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      console.log('[Items] Calling delete API for:', itemToDelete.id);
      await api.delete(`/items/${itemToDelete.id}`);
      console.log('[Items] Delete successful');
      setDeleteModal(false);
      setItemToDelete(null);
      await load();
      alert(`Item deleted successfully.`);
    } catch (err: any) {
      console.error('[Items] Failed to delete item:', err);
      const msg = err.response?.data?.message || 'Failed to delete item';
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>Items</Typography>
        {canEdit(user?.role ?? '') && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCsv} />
            <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>Import CSV</Button>
            <Button variant="contained" onClick={openAdd}>Add item</Button>
          </Box>
        )}
      </Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search by name or SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 220, flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select value={categoryId} label="Category" onChange={(e) => setCategoryId(e.target.value)}>
                <MenuItem value="">All categories</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={load}>Search</Button>
          </Box>
        </CardContent>
      </Card>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Barcode</TableCell>
              <TableCell align="right">Reorder</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {i.imageUrl ? (
                      <Box component="img" src={i.imageUrl} sx={{ width: 32, height: 32, borderRadius: 1.5, objectFit: 'cover' }} />
                    ) : (
                      <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                        <Typography variant="overline" sx={{ fontWeight: 800 }}>{i.name.charAt(0)}</Typography>
                      </Box>
                    )}
                    <Typography variant="body2" fontWeight={500}>{i.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{i.sku}</TableCell>
                <TableCell>{i.category?.name ?? '—'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {i.barcode || i.sku}
                    </Typography>
                    <Tooltip title="Print barcodes">
                      <IconButton size="small" onClick={() => handleOpenPrintDialog(i)}>
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="right">{i.reorderLevel}</TableCell>
                <TableCell align="right">{Number(i.price).toFixed(2)}</TableCell>
                <TableCell align="right">{Number(i.costPrice ?? 0).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    {canEdit(user?.role ?? '') && (
                      <Button size="small" onClick={() => openEdit(i)}>Edit</Button>
                    )}
                    {(user?.role === 'admin' || user?.role === 'dealer') && (
                      <Button size="small" color="error" onClick={() => handleDeleteItem(i)}>Delete</Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={modal !== null} onClose={() => setModal(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{modal === 'add' ? 'Add item' : 'Edit item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} fullWidth />
            <TextField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={form.categoryId} label="Category" onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                Upload Image
                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
              </Button>
              {form.imageUrl && <Box component="img" src={form.imageUrl} sx={{ height: 40, borderRadius: 1 }} />}
            </Box>
            <TextField label="Unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} fullWidth />
            <TextField 
              label="Barcode" 
              value={form.barcode} 
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} 
              fullWidth 
              helperText="Leave empty to use SKU as barcode"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setCameraOpen(true)} color="primary">
                      <QrCodeScannerIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField type="number" label="Reorder level" value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))} inputProps={{ min: 0 }} fullWidth />
            <TextField type="number" label="Price (selling)" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} inputProps={{ min: 0, step: 0.01 }} fullWidth />
            <TextField type="number" label="Cost (COGS)" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))} inputProps={{ min: 0, step: 0.01 }} helperText="Unit cost used for Cost of Goods Sold when sold" fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={printDialog} onClose={() => setPrintDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Print Barcodes</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              How many copies of the barcode for <strong>{itemToPrint?.name}</strong> would you like to print?
            </Typography>
            <TextField
              autoFocus
              label="Number of copies"
              type="number"
              fullWidth
              value={printCount}
              onChange={(e) => setPrintCount(Math.max(1, Number(e.target.value)))}
              onKeyUp={(e) => {
                if (e.key === 'Enter') handleDoPrint();
              }}
              slotProps={{
                htmlInput: { min: 1, max: 100 }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPrintDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleDoPrint}>
            Print {printCount} Copies
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModal} onClose={() => !deleting && setDeleteModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
            Are you sure you want to delete <strong>{itemToDelete?.name}</strong> ({itemToDelete?.sku})?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will hide the item from current inventory lists, but it will remain in historical records of sales and distributions.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteModal(false)} disabled={deleting}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={confirmDelete} 
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Item'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <BarcodeScannerDialog 
        open={cameraOpen} 
        onClose={() => setCameraOpen(false)} 
        onScan={(code) => {
          setForm((f) => ({ ...f, barcode: code }));
          setCameraOpen(false);
        }}
      />
    </Box>
  );
}
