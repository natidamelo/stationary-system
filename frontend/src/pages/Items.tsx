import React, { useEffect, useState, useRef } from 'react';
import { typography } from '../theme/typography';
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
  Snackbar,
  Alert,
  InputAdornment,
  Grid,
  Chip,
  Link,
} from '@mui/material';
import {
  Print as PrintIcon,
  QrCodeScanner as QrCodeScannerIcon,
  VisibilityOutlined as ViewIcon,
  EditOutlined as EditIcon,
  TuneOutlined as AdjustIcon,
  DeleteOutline as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import JsBarcode from 'jsbarcode';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BarcodeScannerDialog from '../components/BarcodeScannerDialog';
import { useUsbBarcodeScanner } from '../hooks/useUsbBarcodeScanner';

type Item = {
  id: string;
  sku: string;
  name: string;
  categoryId?: string;
  category?: { id: string; name: string };
  unit: string;
  reorderLevel: number;
  maxStockLevel: number;
  price: number;
  costPrice: number;
  imageUrl?: string;
  barcode?: string;
  isActive: boolean;
  currentStock: number;
  description?: string;
  tags?: string[];
};

type Store = { id: string; name: string; location: string };
type Supplier = { id: string; name: string };

const canEdit = (role: string) => ['admin', 'manager', 'inventory_clerk'].includes(role);

export default function Items() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState(user?.storeId || 'all');
  const [categoryId, setCategoryId] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name-az');

  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  
  // Form State
  const [form, setForm] = useState({
    sku: '',
    name: '',
    categoryId: '',
    unit: 'Piece',
    initialStock: 0,
    reorderLevel: 10,
    maxStockLevel: 100,
    price: 0,
    costPrice: 0,
    barcode: '',
    imageUrl: '',
    description: '',
    tags: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const [quickCategoryModal, setQuickCategoryModal] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  
  // Stock Adjustment Shortcut Dialog
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState('');

  // Barcode / Scanner dialogs
  const [printDialog, setPrintDialog] = useState(false);
  const [printCount, setPrintCount] = useState(20);
  const [itemToPrint, setItemToPrint] = useState<Item | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // USB Barcode Scanner Notifications
  const [scanNotification, setScanNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId && categoryId !== 'all') params.set('categoryId', categoryId);
    if (selectedStore) params.set('storeId', selectedStore);

    return Promise.all([
      api.get<Item[]>(`/items?${params.toString()}`).then((r) => setItems(r.data)),
      api.get<Array<{ id: string; name: string }>>('/categories').then((r) => setCategories(r.data)),
      api.get<Store[]>('/stores').then((r) => setStores(r.data)),
      api.get<Supplier[]>('/suppliers').then((r) => setSuppliers(r.data)),
    ]);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [selectedStore, categoryId, search]);

  useEffect(() => {
    if (user?.storeId) {
      setSelectedStore(user.storeId);
    }
  }, [user?.storeId]);

  const handleBarcodeScan = async (barcode: string) => {
    if (modal !== null) {
      setForm((f) => ({
        ...f,
        barcode: barcode,
        sku: f.sku ? f.sku : barcode,
      }));
      setScanNotification({
        open: true,
        message: `Prefilled barcode: ${barcode}`,
        severity: 'success',
      });
      return;
    }

    setScanNotification({
      open: true,
      message: `Scanning barcode: ${barcode}...`,
      severity: 'info',
    });

    try {
      const response = await api.get<Item | null>(`/items/barcode/${barcode}`);
      const foundItem = response.data;

      if (foundItem) {
        setScanNotification({
          open: true,
          message: `Found item: "${foundItem.name}". Opening edit dialog.`,
          severity: 'success',
        });
        openEdit(foundItem);
      } else {
        setScanNotification({
          open: true,
          message: `Barcode "${barcode}" not found. Opening add form.`,
          severity: 'warning',
        });
        openAddPrefilled(barcode);
      }
    } catch (error) {
      console.error('Error finding barcode:', error);
      setScanNotification({
        open: true,
        message: `Error searching barcode "${barcode}".`,
        severity: 'error',
      });
    }
  };

  useUsbBarcodeScanner(handleBarcodeScan, {
    excludeIds: ['sku-field', 'barcode-field'],
  });

  const openAdd = async () => {
    try {
      const res = await api.get<{ sku: string }>('/items/next-sku');
      setForm({
        sku: res.data.sku,
        name: '',
        categoryId: '',
        unit: 'Piece',
        initialStock: 0,
        reorderLevel: 10,
        maxStockLevel: 100,
        price: 0,
        costPrice: 0,
        barcode: '',
        imageUrl: '',
        description: '',
        tags: '',
      });
    } catch (e) {
      setForm({
        sku: '',
        name: '',
        categoryId: '',
        unit: 'Piece',
        initialStock: 0,
        reorderLevel: 10,
        maxStockLevel: 100,
        price: 0,
        costPrice: 0,
        barcode: '',
        imageUrl: '',
        description: '',
        tags: '',
      });
    }
    setEditingId(null);
    setModal('add');
  };

  const openAddPrefilled = (barcode: string) => {
    setForm({
      sku: barcode,
      name: '',
      categoryId: '',
      unit: 'Piece',
      initialStock: 0,
      reorderLevel: 10,
      maxStockLevel: 100,
      price: 0,
      costPrice: 0,
      barcode: barcode,
      imageUrl: '',
      description: '',
      tags: '',
    });
    setEditingId(null);
    setModal('add');
  };

  const openEdit = (i: Item) => {
    setForm({
      sku: i.sku,
      name: i.name,
      categoryId: i.categoryId || i.category?.id || '',
      unit: i.unit || 'Piece',
      initialStock: 0,
      reorderLevel: i.reorderLevel ?? 10,
      maxStockLevel: i.maxStockLevel ?? 100,
      price: i.price ?? 0,
      costPrice: i.costPrice ?? 0,
      barcode: i.barcode ?? i.sku,
      imageUrl: i.imageUrl ?? '',
      description: i.description ?? '',
      tags: Array.isArray(i.tags) ? i.tags.join(', ') : '',
    });
    setEditingId(i.id);
    setModal('edit');
  };

  const save = async () => {
    const payload = {
      ...form,
      categoryId: form.categoryId || undefined,
      reorderLevel: Number(form.reorderLevel),
      maxStockLevel: Number(form.maxStockLevel),
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      barcode: form.barcode || form.sku,
      imageUrl: form.imageUrl || undefined,
    };
    try {
      if (editingId) {
        await api.put(`/items/${editingId}`, payload);
      } else {
        await api.post('/items', payload);
      }
      setModal(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save product');
    }
  };

  const saveQuickCategory = async () => {
    if (!quickCategoryName.trim()) return;
    try {
      const res = await api.post('/categories', { name: quickCategoryName.trim() });
      setCategories((prev) => [...prev, res.data]);
      setForm((f) => ({ ...f, categoryId: res.data.id }));
      setQuickCategoryModal(false);
      setQuickCategoryName('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create category');
    }
  };

  const saveStockAdjustment = async () => {
    if (!adjustItem || adjustQty === 0) return;
    try {
      await api.post('/inventory/adjustment', {
        itemId: adjustItem.id,
        quantity: adjustQty,
        notes: adjustNotes || 'Quick adjustment from Products list',
      });
      setAdjustModal(false);
      setAdjustItem(null);
      setAdjustQty(0);
      setAdjustNotes('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const handleDeleteItem = (item: Item) => {
    setItemToDelete(item);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/items/${itemToDelete.id}`);
      setDeleteModal(false);
      setItemToDelete(null);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenPrintDialog = (item: Item) => {
    setItemToPrint(item);
    setPrintCount(20);
    setPrintDialog(true);
  };

  const printBarcode = (item: Item, count: number = 20) => {
    const barcode = item.barcode || item.sku;
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: 3,
        height: 85,
        displayValue: true,
        fontSize: 14,
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
                @page { margin: 5mm; size: A4 portrait; }
                body { margin: 0; padding: 0; }
              }
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 4mm; }
              .grid { display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start; }
              .label { width: 75mm; height: 40mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3mm; border: 0.5mm solid #000; page-break-inside: avoid; overflow: hidden; }
              .item-name { font-size: 10pt; font-weight: bold; line-height: 1.2; max-width: 70mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 2mm; }
              .item-sku { font-size: 8pt; color: #444; margin-bottom: 2mm; }
              .barcode-img { max-width: 90%; height: auto; image-rendering: pixelated; }
            </style>
          </head>
          <body><div class="grid">${labelsHtml}</div><script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script></body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      alert('Error generating barcode.');
    }
  };

  const handleDoPrint = () => {
    if (itemToPrint) {
      printBarcode(itemToPrint, printCount);
      setPrintDialog(false);
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.name.toLowerCase()]: c.id, [c.id]: c.id }), {} as Record<string, string>);
      const res = await api.post('/items/bulk-import', { csv: text, categoryMap });
      alert(`Successfully imported/updated ${res.data.imported} items.`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const getStockStatusChip = (item: Item) => {
    const stock = item.currentStock || 0;
    if (stock <= 0) {
      return <Chip label="Out of Stock" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 600 }} />;
    } else if (stock <= item.reorderLevel) {
      return <Chip label={`Low Stock (${stock})`} size="small" sx={{ bgcolor: '#ffedd5', color: '#ea580c', fontWeight: 600 }} />;
    }
    return <Chip label={`In Stock (${stock})`} size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 600 }} />;
  };

  // Frontend filtering and sorting
  const filteredItems = items
    .filter((item) => {
      // Stock Status Filter
      const stock = item.currentStock || 0;
      if (stockStatus === 'in') return stock > item.reorderLevel;
      if (stockStatus === 'low') return stock > 0 && stock <= item.reorderLevel;
      if (stockStatus === 'out') return stock <= 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name-az') return a.name.localeCompare(b.name);
      if (sortBy === 'name-za') return b.name.localeCompare(a.name);
      if (sortBy === 'sku-az') return a.sku.localeCompare(b.sku);
      if (sortBy === 'price-lh') return a.price - b.price;
      if (sortBy === 'price-hl') return b.price - a.price;
      return 0;
    });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} thickness={4} sx={{ color: '#4f46e5' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={typography.fontWeightBold} sx={{ letterSpacing: typography.pageTitle.letterSpacing, mb: 0.5 }}>Products</Typography>
          <Typography variant="body2" color="text.secondary">View, add, edit, and manage physical inventory levels.</Typography>
        </Box>
        {canEdit(user?.role ?? '') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', px: 2.5, py: 1, borderRadius: 2, fontWeight: typography.fontWeightSemiBold }}
          >
            Add Product
          </Button>
        )}
      </Box>

      {/* Filter Toolbar */}
      <Card variant="outlined" sx={{ mb: 3, border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <TextField
              placeholder="Search by SKU or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            {/* Scan Button */}
            <Button
              variant="outlined"
              onClick={() => setCameraOpen(true)}
              startIcon={<QrCodeScannerIcon />}
              sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#cbd5e1', color: '#475569' }}
            >
              Scan
            </Button>

            {/* Store Filter */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">All Stores (Total Stock)</MenuItem>
                {stores.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Category Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Supplier Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">All Suppliers</MenuItem>
                {suppliers.map((sup) => (
                  <MenuItem key={sup.id} value={sup.id}>{sup.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Stock Status Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">All Stock Status</MenuItem>
                <MenuItem value="in">In Stock</MenuItem>
                <MenuItem value="low">Low Stock</MenuItem>
                <MenuItem value="out">Out of Stock</MenuItem>
              </Select>
            </FormControl>

            {/* Sorting */}
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="name-az">Name (A-Z)</MenuItem>
                <MenuItem value="name-za">Name (Z-A)</MenuItem>
                <MenuItem value="sku-az">SKU (A-Z)</MenuItem>
                <MenuItem value="price-lh">Price (Low-High)</MenuItem>
                <MenuItem value="price-hl">Price (High-Low)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Main Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Table size="medium">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>SKU</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>PRODUCT NAME</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>STOCK STATUS</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>LOCATION</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="right">COST PRICE</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="right">SELLING PRICE</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569', textAlign: 'center' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((i) => (
              <TableRow key={i.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ fontFamily: typography.fontFamilyMono, fontSize: typography.mono.fontSize, fontWeight: typography.fontWeightMedium, color: '#64748b' }}>{i.sku}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {i.imageUrl ? (
                      <Box component="img" src={i.imageUrl} sx={{ width: 36, height: 36, borderRadius: 2, objectFit: 'cover' }} />
                    ) : (
                      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                        <Typography variant="overline" sx={{ fontWeight: typography.fontWeightExtraBold, fontSize: typography.body.fontSize }}>{i.name.charAt(0)}</Typography>
                      </Box>
                    )}
                    <Typography variant="body2" fontWeight={typography.fontWeightSemiBold} color="#1e293b">{i.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#475569' }}>{i.category?.name ?? '—'}</TableCell>
                <TableCell>{getStockStatusChip(i)}</TableCell>
                <TableCell sx={{ color: '#64748b' }}>
                  {selectedStore !== 'all' ? stores.find(s => s.id === selectedStore)?.location || '—' : '—'}
                </TableCell>
                <TableCell align="right" sx={{ color: '#475569' }}>ETB {Number(i.costPrice ?? 0).toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b' }}>ETB {Number(i.price).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => setViewItem(i)} sx={{ color: '#64748b' }}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canEdit(user?.role ?? '') && (
                      <>
                        <Tooltip title="Edit Product">
                          <IconButton size="small" onClick={() => openEdit(i)} sx={{ color: '#4f46e5' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Adjust Stock">
                          <IconButton size="small" onClick={() => { setAdjustItem(i); setAdjustModal(true); }} sx={{ color: '#d97706' }}>
                            <AdjustIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {user?.role === 'admin' && (
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteItem(i)} sx={{ color: '#ef4444' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CSV Import Shortcut */}
      {canEdit(user?.role ?? '') && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCsv} />
          <Button variant="text" size="small" onClick={() => fileInputRef.current?.click()} sx={{ textTransform: 'none', color: '#64748b' }}>
            Bulk CSV Import
          </Button>
        </Box>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={modal !== null} onClose={() => setModal(null)} maxWidth="md" fullWidth sx={{ '& .MuiPaper-root': { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{modal === 'add' ? 'Add New Product' : 'Edit Product'}</DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="sku-field"
                label="Product ID (Auto-generated)"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                fullWidth
                disabled={modal === 'edit'}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="name-field"
                label="Product Name *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Category *</InputLabel>
                  <Select
                    value={form.categoryId}
                    label="Category *"
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">Select Category</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {canEdit(user?.role ?? '') && (
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setQuickCategoryModal(true)}
                    sx={{ minWidth: 80, fontWeight: 600, textDecoration: 'none', color: '#4f46e5' }}
                  >
                    + Add New
                  </Link>
                )}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Unit *</InputLabel>
                <Select
                  value={form.unit}
                  label="Unit *"
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="Piece">Piece</MenuItem>
                  <MenuItem value="Pack">Pack</MenuItem>
                  <MenuItem value="Ream">Ream</MenuItem>
                  <MenuItem value="Box">Box</MenuItem>
                  <MenuItem value="Dozen">Dozen</MenuItem>
                  <MenuItem value="Roll">Roll</MenuItem>
                  <MenuItem value="Set">Set</MenuItem>
                  <MenuItem value="Book">Book</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {modal === 'add' && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  type="number"
                  label="Initial Stock *"
                  value={form.initialStock}
                  onChange={(e) => setForm((f) => ({ ...f, initialStock: Number(e.target.value) }))}
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: modal === 'add' ? 4 : 6 }}>
              <TextField
                type="number"
                label="Min Stock Level (Low Threshold) *"
                value={form.reorderLevel}
                onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: modal === 'add' ? 4 : 6 }}>
              <TextField
                type="number"
                label="Max Stock Level (Reorder Target) *"
                value={form.maxStockLevel}
                onChange={(e) => setForm((f) => ({ ...f, maxStockLevel: Number(e.target.value) }))}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number"
                label="Cost Price (ETB)"
                value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number"
                label="Selling Price (ETB) *"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="barcode-field"
                label="Barcode"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                fullWidth
                placeholder="e.g. 880123456"
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', height: '100%' }}>
                <Button variant="outlined" component="label" sx={{ textTransform: 'none', borderRadius: 2 }}>
                  Upload Image
                  <input type="file" hidden accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setForm(f => ({ ...f, imageUrl: reader.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                </Button>
                {form.imageUrl && <Box component="img" src={form.imageUrl} sx={{ height: 40, width: 40, borderRadius: 1.5, objectFit: 'cover' }} />}
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                fullWidth
                multiline
                rows={3}
                placeholder="Product details and specifications..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Tags (Comma separated)"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                fullWidth
                placeholder="e.g. office, paper, white"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setModal(null)} sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!form.name || !form.categoryId}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', px: 3, borderRadius: 2 }}
          >
            {modal === 'add' ? 'Create Product' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Add Category Dialog */}
      <Dialog open={quickCategoryModal} onClose={() => setQuickCategoryModal(false)} sx={{ '& .MuiPaper-root': { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Category Name"
            value={quickCategoryName}
            onChange={(e) => setQuickCategoryName(e.target.value)}
            fullWidth
            sx={{ mt: 1, minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickCategoryModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={saveQuickCategory} disabled={!quickCategoryName.trim()} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Stock Adjustment Dialog */}
      <Dialog open={adjustModal} onClose={() => setAdjustModal(false)} sx={{ '& .MuiPaper-root': { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Quick Stock Adjustment</DialogTitle>
        <DialogContent sx={{ minWidth: 320 }}>
          {adjustItem && (
            <Typography variant="body2" sx={{ mb: 2, color: '#475569' }}>
              Adjust stock for **{adjustItem.name}** in the active store.
              <br />
              Current stock: **{adjustItem.currentStock || 0}**.
            </Typography>
          )}
          <TextField
            type="number"
            label="Quantity (Positive to add, Negative to subtract)"
            value={adjustQty || ''}
            onChange={(e) => setAdjustQty(Number(e.target.value))}
            fullWidth
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            label="Notes"
            value={adjustNotes}
            onChange={(e) => setAdjustNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={saveStockAdjustment} disabled={adjustQty === 0} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Details Viewer Dialog */}
      <Dialog open={viewItem !== null} onClose={() => setViewItem(null)} maxWidth="sm" fullWidth sx={{ '& .MuiPaper-root': { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Product Details</span>
          {viewItem && (
            <IconButton size="small" onClick={() => handleOpenPrintDialog(viewItem)} sx={{ color: '#4f46e5' }}>
              <PrintIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {viewItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {viewItem.imageUrl && (
                <Box component="img" src={viewItem.imageUrl} sx={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 3, border: '1px solid #f1f5f9' }} />
              )}
              <Box>
                <Typography variant="h6" fontWeight={typography.fontWeightBold} color="#1e293b">{viewItem.name}</Typography>
                <Typography variant="caption" sx={{ fontFamily: typography.fontFamilyMono, color: '#64748b', fontSize: typography.mono.fontSize }}>SKU: {viewItem.sku}</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">CATEGORY</Typography>
                  <Typography variant="body2" fontWeight={typography.fontWeightSemiBold}>{viewItem.category?.name ?? '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">UNIT</Typography>
                  <Typography variant="body2" fontWeight={typography.fontWeightSemiBold}>{viewItem.unit}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">CURRENT STOCK</Typography>
                  <Box sx={{ mt: 0.5 }}>{getStockStatusChip(viewItem)}</Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">BARCODE</Typography>
                  <Typography variant="body2" sx={{ fontFamily: typography.fontFamilyMono, fontSize: typography.mono.fontSize }}>{viewItem.barcode || viewItem.sku}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">MIN THRESHOLD</Typography>
                  <Typography variant="body2" fontWeight={typography.fontWeightSemiBold}>{viewItem.reorderLevel}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">MAX TARGET</Typography>
                  <Typography variant="body2" fontWeight={typography.fontWeightSemiBold}>{viewItem.maxStockLevel ?? 100}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary">UNIT</Typography>
                  <Typography variant="body2" fontWeight={typography.fontWeightSemiBold}>{viewItem.unit}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">COST PRICE</Typography>
                  <Typography variant="body2" fontWeight={typography.fontWeightSemiBold}>ETB {Number(viewItem.costPrice ?? 0).toFixed(2)}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">SELLING PRICE</Typography>
                  <Typography variant="body2" fontWeight={typography.fontWeightBold} color="#4f46e5">ETB {Number(viewItem.price).toFixed(2)}</Typography>
                </Grid>
              </Grid>

              {viewItem.description && (
                <Box>
                  <Typography variant="caption" color="text.secondary">DESCRIPTION</Typography>
                  <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>{viewItem.description}</Typography>
                </Box>
              )}

              {viewItem.tags && viewItem.tags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>TAGS</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {viewItem.tags.map((t) => (
                      <Chip key={t} label={t} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewItem(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Print Setup Dialog */}
      <Dialog open={printDialog} onClose={() => setPrintDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Print Barcodes</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#475569' }}>
            Set label count to print for **{itemToPrint?.name}** (SKU: {itemToPrint?.sku}).
          </Typography>
          <TextField
            type="number"
            label="Label Count"
            value={printCount}
            onChange={(e) => setPrintCount(Number(e.target.value))}
            fullWidth
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleDoPrint} sx={{ borderRadius: 2 }}>
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModal} onClose={() => setDeleteModal(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Product</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete product **{itemToDelete?.name}**?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModal(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting} sx={{ borderRadius: 2 }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scanner Dialog */}
      <BarcodeScannerDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onScan={handleBarcodeScan} />

      {/* Scanner Notifications */}
      <Snackbar
        open={scanNotification.open}
        autoHideDuration={4000}
        onClose={() => setScanNotification((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={scanNotification.severity} variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
          {scanNotification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
