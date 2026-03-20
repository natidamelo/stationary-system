import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import JsBarcode from 'jsbarcode';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BarcodeScannerDialog from '../components/BarcodeScannerDialog';
import { 
  QrCodeScanner as QrCodeScannerIcon 
} from '@mui/icons-material';
import { InputAdornment } from '@mui/material';

type LowStock = { id: string; sku: string; name: string; currentStock: number; reorderLevel: number; unit: string; category?: { name: string } };
type Movement = { id: string; type: string; quantity: number; balanceAfter: number; createdAt: string; item?: { name: string; sku: string }; notes?: string };
type Distribution = {
  id: string;
  distributionNumber: string;
  department?: string;
  createdAt: string;
  issuedToUser?: { fullName: string };
  lines: Array<{ quantity: number; item: { name: string; sku: string } }>;
};
type StockSummary = {
  totalItems: number;
  totalStockValue: number;
  lowStockCount: number;
  recentDistributions: number;
  recentMovements: number;
};
type StockItem = {
  id: string;
  sku: string;
  name: string;
  category?: { id: string; name: string };
  unit: string;
  reorderLevel: number;
  price: number;
  costPrice: number;
  sellPrice: number;
  currentStock: number;
  barcode?: string;
  isActive: boolean;
};

const canManage = (role: string) => ['admin', 'manager', 'inventory_clerk'].includes(role);

export default function StockManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Summary data
  const [summary, setSummary] = useState<StockSummary | null>(null);
  
  // Inventory data
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string; sku: string }>>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  
  // Distribution data
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string }>>([]);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Modals
  const [adjustModal, setAdjustModal] = useState(false);
  const [issueModal, setIssueModal] = useState(false);
  const [addItemModal, setAddItemModal] = useState(false);
  const [editStockModal, setEditStockModal] = useState(false);
  const [printDialog, setPrintDialog] = useState(false);
  
  // Forms
  const [adjustForm, setAdjustForm] = useState({ itemId: '', quantity: 0, notes: '' });
  const [issueForm, setIssueForm] = useState({ issuedToUserId: '', department: '', notes: '', lines: [{ itemId: '', quantity: 1 }] });
  const [itemForm, setItemForm] = useState({ sku: '', name: '', categoryId: '', unit: 'unit', reorderLevel: 0, price: 0, sellPrice: 0, barcode: '' });
  const [editStockForm, setEditStockForm] = useState({ itemId: '', quantity: 0, costPrice: 0, sellPrice: 0, reorderLevel: 0 });
  const [printCount, setPrintCount] = useState(1);
  const [itemToPrint, setItemToPrint] = useState<StockItem | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const printBarcode = (item: StockItem, count: number = 1) => {
    const barcode = item.barcode || item.sku;
    const canvas = document.createElement('canvas');
    
    try {
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: 2.5, // Increased for better scanning
        height: 60,  // Increased for better scanning
        displayValue: true,
        fontSize: 12,
        margin: 10,  // Better white space around barcode
      });

      const labelHtml = `
        <div class="barcode-container">
          <div style="font-weight: bold; margin-bottom: 5px; font-size: 10px;">${item.name}</div>
          <div style="font-size: 9px; margin-bottom: 5px;">SKU: ${item.sku}</div>
          <img src="${canvas.toDataURL()}" alt="Barcode" style="max-width: 100%; height: auto;" />
          <div class="item-info">Barcode: ${barcode}</div>
        </div>`;

      const labelsHtml = Array(count).fill(labelHtml).join('');

      // Create a new window for printing
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
                  size: A4;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: Arial, sans-serif;
                padding: 10mm;
                background: #fff;
              }
              .grid {
                display: flex;
                flex-wrap: wrap;
                gap: 5mm;
                justify-content: flex-start;
              }
              .barcode-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 45mm;
                height: 30mm;
                padding: 2mm;
                border: 0.2mm solid #ccc;
                page-break-inside: avoid;
                text-align: center;
              }
              .item-info {
                margin-top: 5px;
                font-size: 8px;
                font-family: monospace;
              }
              img {
                image-rendering: -webkit-optimize-contrast; /* Sharper on some browsers */
                image-rendering: pixelated; /* Sharpest for barcodes */
              }
            </style>
          </head>
          <body>
            <div class="grid">
              ${labelsHtml}
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              };
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

  const handleOpenPrintDialog = (item: StockItem) => {
    setItemToPrint(item);
    setPrintCount(20); // Default to 20 as requested
    setPrintDialog(true);
  };

  const handleDoPrint = () => {
    if (itemToPrint) {
      printBarcode(itemToPrint, printCount);
      setPrintDialog(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [lowStockRes, movementsRes, distributionsRes, itemsRes, usersRes, categoriesRes] = await Promise.allSettled([
        api.get<LowStock[]>('/inventory/low-stock'),
        api.get<Movement[]>('/inventory/movements?limit=50'),
        api.get<Distribution[]>('/distribution'),
        api.get<Array<any>>('/items'),
        api.get<Array<{ id: string; fullName: string }>>('/users'),
        api.get<Array<{ id: string; name: string }>>('/categories'),
      ]);

      const lowStockData: LowStock[] = lowStockRes.status === 'fulfilled' ? lowStockRes.value.data : [];
      const movementsData: Movement[] = movementsRes.status === 'fulfilled' ? movementsRes.value.data : [];
      const distributionsData: Distribution[] = distributionsRes.status === 'fulfilled' ? distributionsRes.value.data : [];
      const itemsData: any[] = itemsRes.status === 'fulfilled' ? itemsRes.value.data : [];
      const usersData: Array<{ id: string; fullName: string }> = usersRes.status === 'fulfilled' ? usersRes.value.data : [];
      const categoriesData: Array<{ id: string; name: string }> = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : [];

      // Log any failures to help debug
      if (lowStockRes.status === 'rejected') console.warn('low-stock failed:', lowStockRes.reason);
      if (movementsRes.status === 'rejected') console.warn('movements failed:', movementsRes.reason);
      if (distributionsRes.status === 'rejected') console.warn('distribution failed:', distributionsRes.reason);
      if (itemsRes.status === 'rejected') console.error('items failed:', itemsRes.reason);
      if (usersRes.status === 'rejected') console.warn('users failed:', usersRes.reason);
      if (categoriesRes.status === 'rejected') console.warn('categories failed:', categoriesRes.reason);

      setLowStock(lowStockData);
      setMovements(movementsData);
      setDistributions(distributionsData);
      setItems(itemsData);
      setUsers(usersData);
      setCategories(categoriesData);

      // Create stock items with balances from movements (API returns types in lowercase: 'purchase', 'sale', etc.)
      const stockBalances: Record<string, number> = {};
      movementsData.forEach((m) => {
        if (m.item) {
          const itemId = (m.item as any).id || m.item.sku;
          if (!stockBalances[itemId]) stockBalances[itemId] = 0;
          const type = (m.type || '').toLowerCase();
          if (type === 'purchase' || type === 'return' || type === 'adjustment') {
            stockBalances[itemId] += m.quantity;
          } else {
            stockBalances[itemId] -= m.quantity;
          }
        }
      });
      // Override with balanceAfter from the latest movement per item (movements are sorted newest first)
      const seenItemsForBalance = new Set<string>();
      movementsData.forEach((m) => {
        if (m.item && m.balanceAfter !== undefined) {
          const itemId = (m.item as any).id || m.item.sku;
          if (itemId && !seenItemsForBalance.has(itemId)) {
            seenItemsForBalance.add(itemId);
            stockBalances[itemId] = m.balanceAfter;
          }
        }
      });

      // Merge with low stock data which has accurate currentStock
      lowStockData.forEach((ls) => {
        stockBalances[ls.id] = ls.currentStock;
      });

      const stockItemsWithBalance: StockItem[] = itemsData.map((item) => {
        const costPrice = Number(item.costPrice ?? item.price ?? 0);
        const sellPrice = Number(item.price ?? (costPrice * 1.5));
        const currentStock = stockBalances[item.id] || 0;
        return {
          ...item,
          barcode: (item as any).barcode || item.sku,
          costPrice,
          sellPrice,
          currentStock,
        } as StockItem;
      });

      setStockItems(stockItemsWithBalance);
      
      // Expand all categories by default, always include Uncategorized
      const categoryNames = new Set(stockItemsWithBalance.map(item => item.category?.name || 'Uncategorized'));
      categoryNames.add('Uncategorized');
      setExpandedCategories(categoryNames);

      if (stockItemsWithBalance.length === 0) {
        console.warn('StockManagement: No items found in /items response');
      }

      // Calculate summary
      const totalItems = itemsData.length;
      const lowStockCount = lowStockData.length;
      const recentDistributions = distributionsData.slice(0, 7).length;
      const recentMovements = movementsData.length;
      const totalStockValue = stockItemsWithBalance.reduce((sum, item) => sum + (item.currentStock * item.sellPrice), 0);

      setSummary({
        totalItems,
        totalStockValue,
        lowStockCount,
        recentDistributions,
        recentMovements,
      });
    } catch (error: any) {
      console.error('Failed to load stock data:', error);
      setError(error.response?.data?.message || 'Failed to connect to the server. Please check your internet or backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runAdjustment = async () => {
    if (!adjustForm.itemId || adjustForm.quantity === 0) return;
    try {
      await api.post('/inventory/adjustment', adjustForm);
      setAdjustModal(false);
      setAdjustForm({ itemId: '', quantity: 0, notes: '' });
      loadData();
    } catch (e: any) {
      console.error('Failed to adjust stock:', e);
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to adjust stock.'));
    }
  };

  const issueItems = async () => {
    const lines = issueForm.lines.filter((l) => l.itemId && l.quantity > 0);
    if (!lines.length) return;
    try {
      await api.post('/distribution/issue', {
        issuedToUserId: issueForm.issuedToUserId || undefined,
        department: issueForm.department || undefined,
        notes: issueForm.notes || undefined,
        lines,
      });
      setIssueModal(false);
      setIssueForm({ issuedToUserId: '', department: '', notes: '', lines: [{ itemId: '', quantity: 1 }] });
      loadData();
    } catch (e: any) {
      console.error('Failed to issue items:', e);
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to issue items.'));
    }
  };

  const saveItem = async () => {
    if (!itemForm.sku || !itemForm.name) return;
    try {
      const payload = {
        ...itemForm,
        categoryId: itemForm.categoryId || undefined,
        reorderLevel: Number(itemForm.reorderLevel),
        costPrice: Number(itemForm.price),
        price: Number(itemForm.sellPrice),
        barcode: itemForm.barcode || itemForm.sku, // Use SKU as fallback if barcode not provided
      };
      await api.post('/items', payload);
      setAddItemModal(false);
      setItemForm({ sku: '', name: '', categoryId: '', unit: 'unit', reorderLevel: 0, price: 0, sellPrice: 0, barcode: '' });
      loadData();
    } catch (e: any) {
      console.error('Failed to save item:', e);
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to save item. The SKU or Barcode might already exist.'));
    }
  };

  const handleEditStock = (item: StockItem) => {
    setEditStockForm({
      itemId: item.id,
      quantity: item.currentStock,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      reorderLevel: item.reorderLevel,
    });
    setEditStockModal(true);
  };

  const handleEditStockSubmit = async () => {
    if (!editStockForm.itemId) return;
    
    try {
      // Update item: costPrice for COGS, price = selling price, reorderLevel
      await api.put(`/items/${editStockForm.itemId}`, {
        costPrice: editStockForm.costPrice,
        price: editStockForm.sellPrice,
        reorderLevel: editStockForm.reorderLevel,
      });

      // Adjust stock quantity if changed
      const currentItem = stockItems.find(i => i.id === editStockForm.itemId);
      if (currentItem && editStockForm.quantity !== currentItem.currentStock) {
        const quantityDiff = editStockForm.quantity - currentItem.currentStock;
        if (quantityDiff !== 0) {
          await api.post('/inventory/adjustment', {
            itemId: editStockForm.itemId,
            quantity: quantityDiff,
            notes: `Stock updated via edit - ${quantityDiff > 0 ? 'added' : 'removed'} ${Math.abs(quantityDiff)} units`,
          });
        }
      }

      setEditStockModal(false);
      setEditStockForm({ itemId: '', quantity: 0, costPrice: 0, sellPrice: 0, reorderLevel: 0 });
      loadData();
    } catch (e: any) {
      console.error('Failed to update stock:', e);
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to update stock.'));
    }
  };

  const handleDeleteItem = (item: StockItem) => {
    console.log('[StockManagement] Opening delete modal for:', item);
    setItemToDelete(item);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      console.log('[StockManagement] Calling delete API for:', itemToDelete.id);
      await api.delete(`/items/${itemToDelete.id}`);
      console.log('[StockManagement] Delete successful');
      setDeleteModal(false);
      setItemToDelete(null);
      await loadData();
      alert(`Item deleted successfully.`);
    } catch (e: any) {
      console.error('[StockManagement] Failed to delete item:', e);
      const msg = e.response?.data?.message;
      const errorStr = Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to delete item.');
      setError(errorStr);
      alert('Failed to delete item: ' + errorStr);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const summaryCards = [
    { label: 'Total Items', value: summary?.totalItems ?? 0, sub: 'In system', bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', text: '#1e40af', icon: '📦' },
    { label: 'Low Stock', value: summary?.lowStockCount ?? 0, sub: 'Need reorder', bg: summary?.lowStockCount ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', text: summary?.lowStockCount ? '#dc2626' : '#475569', icon: '⚠️' },
    { label: 'Recent Distributions', value: summary?.recentDistributions ?? 0, sub: 'Last 7 days', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', text: '#065f46', icon: '📤' },
    { label: 'Stock Movements', value: summary?.recentMovements ?? 0, sub: 'Recent activity', bg: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)', text: '#5b21b6', icon: '📊' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>
            Stock Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage inventory, distributions, and stock movements
          </Typography>
        </Box>
        {canManage(user?.role ?? '') && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setAddItemModal(true)}>Add Item</Button>
            <Button variant="outlined" onClick={() => setAdjustModal(true)}>Stock Adjustment</Button>
            <Button variant="contained" onClick={() => setIssueModal(true)}>Issue Items</Button>
          </Box>
        )}
      </Box>
      
      {error && (
        <Card sx={{ mb: 3, bgcolor: '#fff1f2', border: '1px solid #fda4af' }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="body2" color="#be123c" fontWeight={600}>
               ⚠️ Error: {error}
            </Typography>
            <Button size="small" variant="text" onClick={loadData} sx={{ mt: 1, color: '#be123c', textTransform: 'none' }}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 6, sm: 3 }} key={card.label} sx={{ display: 'flex' }}>
            <Card
              sx={{
                width: '100%',
                minHeight: 82,
                background: card.bg,
                color: card.text,
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
              }}
              onClick={() => {
                if (card.label === 'Low Stock') setActiveTab(2);
                else if (card.label === 'Recent Distributions') setActiveTab(0);
                else if (card.label === 'Stock Movements') setActiveTab(1);
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', p: 1.25, height: '100%' }}>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', lineHeight: 1.2, color: 'inherit' }}>
                    {card.label}
                  </Typography>
                  <Box sx={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                    {card.icon}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: '1.35rem', lineHeight: 1.1, color: 'inherit' }}>
                    {card.value}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500, lineHeight: 1.2, color: 'inherit', opacity: 0.9 }}>
                    {card.sub}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Stock Overview" />
          <Tab label="Movement History" />
          <Tab label="Reorder Suggestions" />
          <Tab label="Expiry Tracking" />
        </Tabs>
      </Box>

      {/* Stock Overview Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Category Filters */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              label={`All (${stockItems.length})`}
              onClick={() => setSelectedCategory('all')}
              color={selectedCategory === 'all' ? 'primary' : 'default'}
              sx={{ cursor: 'pointer', fontWeight: selectedCategory === 'all' ? 600 : 400 }}
            />
            {categories.map((cat) => {
              const count = stockItems.filter(item => item.category?.id === cat.id).length;
              return (
                <Chip
                  key={cat.id}
                  label={`${cat.name} (${count})`}
                  onClick={() => setSelectedCategory(cat.id)}
                  color={selectedCategory === cat.id ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer', fontWeight: selectedCategory === cat.id ? 600 : 400 }}
                />
              );
            })}
          </Box>

          {/* Stock Items Table */}
          <Card variant="outlined">
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Barcode</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Quantity</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Cost Price ($)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Sell Price ($)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Total Cost ($)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Total Value ($)</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', width: 120 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const filteredItems = selectedCategory === 'all' 
                        ? stockItems 
                        : stockItems.filter(item => item.category?.id === selectedCategory);
                      
                      const groupedByCategory = filteredItems.reduce((acc, item) => {
                        const catName = item.category?.name || 'Uncategorized';
                        if (!acc[catName]) acc[catName] = [];
                        acc[catName].push(item);
                        return acc;
                      }, {} as Record<string, StockItem[]>);

                      return Object.entries(groupedByCategory).map(([categoryName, categoryItems]) => (
                        <React.Fragment key={categoryName}>
                          <TableRow
                            sx={{
                              bgcolor: '#f8fafc',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: '#f1f5f9' },
                            }}
                            onClick={() => {
                              const newExpanded = new Set(expandedCategories);
                              if (newExpanded.has(categoryName)) {
                                newExpanded.delete(categoryName);
                              } else {
                                newExpanded.add(categoryName);
                              }
                              setExpandedCategories(newExpanded);
                            }}
                          >
                            <TableCell colSpan={10} sx={{ fontWeight: 600, py: 1.5 }}>
                              {expandedCategories.has(categoryName) ? '▼' : '▶'} {categoryName} ({categoryItems.length})
                            </TableCell>
                          </TableRow>
                          {expandedCategories.has(categoryName) && categoryItems.map((item) => {
                            const totalCost = item.currentStock * item.costPrice;
                            const totalValue = item.currentStock * item.sellPrice;
                            const isLowStock = item.currentStock <= item.reorderLevel;
                            return (
                              <TableRow key={item.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                                <TableCell sx={{ fontWeight: 500 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.sku}</Typography>
                                    <Typography variant="caption" color="text.secondary">{item.name}</Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={item.category?.name || '—'}
                                    size="small"
                                    sx={{
                                      bgcolor: '#dbeafe',
                                      color: '#2563eb',
                                      fontWeight: 500,
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                      {item.barcode || item.sku}
                                    </Typography>
                                      <Tooltip title="Print barcodes">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenPrintDialog(item);
                                          }}
                                          sx={{ p: 0.5 }}
                                        >
                                          <PrintIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>{item.currentStock}</TableCell>
                                <TableCell align="right">{item.costPrice.toFixed(2)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>{item.sellPrice.toFixed(2)}</TableCell>
                                <TableCell align="right">{totalCost.toFixed(2)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                  {totalValue.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={isLowStock ? 'Low Stock' : 'In Stock'}
                                    size="small"
                                    sx={{
                                      bgcolor: isLowStock ? '#fee2e2' : '#dcfce7',
                                      color: isLowStock ? '#dc2626' : '#16a34a',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {canManage(user?.role ?? '') && (
                                      <>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditStock(item);
                                          }}
                                          sx={{ color: 'primary.main' }}
                                          title="Edit stock"
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                        {(user?.role === 'admin' || user?.role === 'dealer') && (
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteItem(item);
                                            }}
                                            sx={{ color: 'error.main' }}
                                            title="Delete item"
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        )}
                                      </>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      ));
                    })()}
                    {stockItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No items found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Movement History Tab */}
      {activeTab === 1 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Stock Movement History ({movements.length})
            </Typography>
            {movements.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No stock movements yet
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Balance After</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {m.item ? `${m.item.sku} – ${m.item.name}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={m.type}
                            size="small"
                            sx={{
                              bgcolor: m.type === 'ADJUSTMENT' ? '#fef3c7' : m.type === 'DISTRIBUTION' ? '#dbeafe' : '#dcfce7',
                              color: m.type === 'ADJUSTMENT' ? '#d97706' : m.type === 'DISTRIBUTION' ? '#2563eb' : '#16a34a',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography component="span" fontWeight={600} color={m.quantity > 0 ? 'success.main' : 'error.main'}>
                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{m.balanceAfter}</TableCell>
                        <TableCell>{m.notes ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reorder Suggestions Tab */}
      {activeTab === 2 && (
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Low Stock Items ({lowStock.length})
              </Typography>
              {lowStock.length > 0 && (
                <Button size="small" variant="outlined" onClick={() => navigate('/purchase-requests')}>
                  Create Purchase Request
                </Button>
              )}
            </Box>
            {lowStock.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                ✅ All items are well stocked
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Current</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Reorder Level</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Unit</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Deficit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStock.map((i) => {
                      const deficit = i.reorderLevel - i.currentStock;
                      return (
                        <TableRow key={i.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                          <TableCell>{i.sku}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{i.name}</TableCell>
                          <TableCell>{i.category?.name ?? '—'}</TableCell>
                          <TableCell align="right">
                            <Typography component="span" fontWeight={600} color="error.main">
                              {i.currentStock}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{i.reorderLevel}</TableCell>
                          <TableCell>{i.unit}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`-${deficit}`}
                              size="small"
                              sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 600 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expiry Tracking Tab */}
      {activeTab === 3 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Expiry Tracking
            </Typography>
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Expiry tracking feature coming soon
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Edit Stock Dialog */}
      <Dialog open={editStockModal} onClose={() => setEditStockModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Stock Information</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: 'text.primary', fontSize: '0.9375rem' }}>
              Stock Information
            </Typography>
            <TextField
              type="number"
              label="Quantity"
              value={editStockForm.quantity}
              onChange={(e) => setEditStockForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
              fullWidth
              required
              InputLabelProps={{ required: true }}
            />
            <TextField
              type="number"
              label="Cost Price (ETB)"
              value={editStockForm.costPrice}
              onChange={(e) => setEditStockForm((f) => ({ ...f, costPrice: Number(e.target.value) }))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
              required
              InputLabelProps={{ required: true }}
            />
            <TextField
              type="number"
              label="Selling Price (ETB)"
              value={editStockForm.sellPrice}
              onChange={(e) => setEditStockForm((f) => ({ ...f, sellPrice: Number(e.target.value) }))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
              required
              InputLabelProps={{ required: true }}
            />
            <TextField
              type="number"
              label="Reorder Level"
              value={editStockForm.reorderLevel}
              onChange={(e) => setEditStockForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
              fullWidth
              required
              InputLabelProps={{ required: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditStockModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditStockSubmit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustModal} onClose={() => setAdjustModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stock Adjustment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Positive = add stock, negative = remove stock.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Item</InputLabel>
              <Select
                value={adjustForm.itemId}
                label="Item"
                onChange={(e) => setAdjustForm((f) => ({ ...f, itemId: e.target.value }))}
              >
                <MenuItem value="">Select item</MenuItem>
                {items.map((i) => (
                  <MenuItem key={i.id} value={i.id}>
                    {i.sku} – {i.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Quantity (signed)"
              value={adjustForm.quantity || ''}
              onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              fullWidth
              helperText="Use positive numbers to add stock, negative to remove"
            />
            <TextField
              label="Notes"
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={runAdjustment} disabled={!adjustForm.itemId || adjustForm.quantity === 0}>
            Apply Adjustment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Issue Items Dialog */}
      <Dialog open={issueModal} onClose={() => setIssueModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Issue Items</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Issued to user</InputLabel>
              <Select
                value={issueForm.issuedToUserId}
                label="Issued to user"
                onChange={(e) => setIssueForm((f) => ({ ...f, issuedToUserId: e.target.value }))}
              >
                <MenuItem value="">—</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Department"
              value={issueForm.department}
              onChange={(e) => setIssueForm((f) => ({ ...f, department: e.target.value }))}
              fullWidth
            />
            <Typography variant="subtitle2" sx={{ mt: 1 }}>Items</Typography>
            {issueForm.lines.map((line, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Select
                  size="small"
                  value={line.itemId}
                  onChange={(e) =>
                    setIssueForm((f) => ({
                      ...f,
                      lines: f.lines.map((l, i) => (i === idx ? { ...l, itemId: e.target.value } : l)),
                    }))
                  }
                  displayEmpty
                  sx={{ minWidth: 220, flex: 2 }}
                >
                  <MenuItem value="">Select item</MenuItem>
                  {items.map((i) => (
                    <MenuItem key={i.id} value={i.id}>
                      {i.sku} – {i.name}
                    </MenuItem>
                  ))}
                </Select>
                <TextField
                  type="number"
                  size="small"
                  value={line.quantity}
                  onChange={(e) =>
                    setIssueForm((f) => ({
                      ...f,
                      lines: f.lines.map((l, i) => (i === idx ? { ...l, quantity: Number(e.target.value) } : l)),
                    }))
                  }
                  inputProps={{ min: 1 }}
                  sx={{ width: 80 }}
                />
              </Box>
            ))}
            <Button size="small" onClick={() => setIssueForm((f) => ({ ...f, lines: [...f.lines, { itemId: '', quantity: 1 }] }))}>
              + Add Line
            </Button>
            <TextField
              label="Notes"
              value={issueForm.notes}
              onChange={(e) => setIssueForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={issueItems} disabled={!issueForm.lines.some((l) => l.itemId && l.quantity > 0)}>
            Issue Items
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemModal} onClose={() => setAddItemModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="SKU"
              value={itemForm.sku}
              onChange={(e) => setItemForm((f) => ({ ...f, sku: e.target.value }))}
              fullWidth
              required
              helperText="Unique stock keeping unit identifier"
            />
            <TextField
              label="Name"
              value={itemForm.name}
              onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={itemForm.categoryId}
                label="Category"
                onChange={(e) => setItemForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <MenuItem value="">—</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Unit"
              value={itemForm.unit}
              onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
              fullWidth
              helperText="e.g., unit, box, pack, ream"
            />
            <TextField
              type="number"
              label="Reorder Level"
              value={itemForm.reorderLevel}
              onChange={(e) => setItemForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
              fullWidth
              helperText="Minimum stock level before reorder alert"
            />
            <TextField
              label="Barcode"
              value={itemForm.barcode}
              onChange={(e) => setItemForm((f) => ({ ...f, barcode: e.target.value }))}
              fullWidth
              helperText="Optional: Scan or type product barcode"
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
            <TextField
              type="number"
              label="Cost Price"
              value={itemForm.price}
              onChange={(e) => {
                const costPrice = Number(e.target.value);
                setItemForm((f) => ({ 
                  ...f, 
                  price: costPrice,
                  sellPrice: f.sellPrice || costPrice * 1.5 // Auto-calculate sell price if not set
                }));
              }}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
              helperText="Purchase/cost price per unit"
            />
            <TextField
              type="number"
              label="Sell Price"
              value={itemForm.sellPrice}
              onChange={(e) => setItemForm((f) => ({ ...f, sellPrice: Number(e.target.value) }))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
              helperText="Selling price per unit"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveItem} disabled={!itemForm.sku || !itemForm.name}>
            Add Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Barcodes Dialog */}
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
            This will hide the item from current stock and inventory lists, but it will remain in historical records (like previous sales and distributions).
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
          setItemForm((f) => ({ ...f, barcode: code }));
          setCameraOpen(false);
        }}
      />
    </Box>
  );
}
