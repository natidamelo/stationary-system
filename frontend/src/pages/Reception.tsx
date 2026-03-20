import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Autocomplete,
  Avatar,
  ListItemText,
  Chip,
  Fade,
  Tooltip,
} from '@mui/material';
import { 
  QrCodeScanner as QrCodeScannerIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingBag as ShoppingBagIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import BarcodeScannerDialog from '../components/BarcodeScannerDialog';

type Sale = {
  id: string;
  saleNumber: string;
  soldAt: string;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  soldBy?: string;
  paymentMethod?: string;
  customerName?: string;
  lines: Array<{ 
    quantity: number; 
    unitPrice: number; 
    total: number; 
    item?: { name: string; sku: string };
    service?: { name: string };
  }>;
};

type Dashboard = {
  todaysSales: Sale[];
  unpaidSales?: Sale[];
  todayRevenue: number;
  todayTransactionCount: number;
  lowStockCount: number;
  lowStockItems: Array<{ name: string; sku: string; currentStock: number; reorderLevel: number }>;
};

type Line = {
  itemId?: string;
  serviceId?: string;
  quantity: number;
  unitPrice: number;
  type: 'item' | 'service';
};

export default function Reception() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [items, setItems] = useState<Array<{ id: string; name: string; sku: string; price: number; barcode?: string; category?: { id: string; name: string }; imageUrl?: string }>>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string; sellingPrice: number; price?: number }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ type: 'item', itemId: '', quantity: 1, unitPrice: 0 }]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [sellError, setSellError] = useState('');
  const [payDialogSale, setPayDialogSale] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState('cash');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState<any>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const navigate = useNavigate();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanningBarcode, setScanningBarcode] = useState(false);


  const load = () => {
    api.get<Dashboard>('/reception/dashboard').then((r) => setDashboard(r.data)).catch(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get<Dashboard>('/reception/dashboard').then((r) => setDashboard(r.data)),
      api.get<Array<any>>('/items').then((r) => setItems(r.data)),
      api.get<Array<any>>('/services').then((r) => setServices(r.data)),
      api.get<Array<{ id: string; name: string }>>('/categories').then((r) => setCategories(r.data)),
    ]).catch(() => {})
      .finally(() => setLoading(false));

    // Cleanup timeout on unmount
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (dashboard && (items.length || services.length)) {
      setLines((prev) => prev.map((l) => {
        if (l.type === 'item' && l.itemId) {
          const item = items.find((i) => i.id === l.itemId);
          return { ...l, unitPrice: l.unitPrice || (item ? Number(item.price) : 0) };
        } else if (l.type === 'service' && l.serviceId) {
          const service = services.find((s) => s.id === l.serviceId);
          return { ...l, unitPrice: l.unitPrice || (service ? Number(service.sellingPrice || service.price || 0) : 0) };
        }
        return l;
      }));
    }
  }, [dashboard, items, services]);

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    setScanningBarcode(true);
    try {
      const response = await api.get(`/items/barcode/${encodeURIComponent(barcode.trim())}`);
      const item = response.data;
      
      if (item) {
        // Find if item already exists in lines
        const existingLineIndex = lines.findIndex((l) => l.type === 'item' && l.itemId === item.id);
        
        if (existingLineIndex >= 0) {
          // Increment quantity if item already in cart
          setLines((prev) => prev.map((l, i) => 
            i === existingLineIndex 
              ? { ...l, quantity: l.quantity + 1 }
              : l
          ));
        } else {
          // Add new line with the scanned item
          setLines((prev) => {
            const newLine: Line = {
              type: 'item' as const,
              itemId: item.id,
              quantity: 1,
              unitPrice: Number(item.price) || 0,
            };
            const lastLine = prev[prev.length - 1];
            const isEmpty = lastLine && !lastLine.itemId && !lastLine.serviceId;
            if (isEmpty) {
              return [...prev.slice(0, -1), newLine];
            }
            return [...prev, newLine];
          });
        }
        setBarcodeInput('');
        // Focus back on barcode input for next scan
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      } else {
        setSellError(`Item with barcode "${barcode}" not found.`);
        setTimeout(() => setSellError(''), 3000);
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response?.data.message;
      setSellError(res || `Item with barcode "${barcode}" not found.`);
      setTimeout(() => setSellError(''), 3000);
    } finally {
      setScanningBarcode(false);
    }
  };

  const handleBarcodeInputChange = (value: string) => {
    setBarcodeInput(value);
    
    // Clear existing timeout
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }
    
    // If Enter is pressed or barcode scanner sends data (usually ends with Enter)
    // Wait a bit for complete barcode input (scanners send data quickly)
    barcodeTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        handleBarcodeScan(value);
      }
    }, 300); // 300ms delay to capture full barcode from scanner
  };

  const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
      handleBarcodeScan(barcodeInput);
    }
  };

  const addLine = (type: 'item' | 'service' = 'item') => setLines((p) => [...p, { type, itemId: type === 'item' ? '' : undefined, serviceId: type === 'service' ? '' : undefined, quantity: 1, unitPrice: 0 }]);

  const handleSelectItem = (target: any) => {
    if (!target) return;
    
    const type = target.type as 'item' | 'service';
    const id = target.id;
    
    setLines((prev) => {
      const existingIdx = prev.findIndex(l => (type === 'item' ? l.itemId === id : l.serviceId === id));
      if (existingIdx >= 0) {
        return prev.map((l, i) => i === existingIdx ? { ...l, quantity: l.quantity + 1 } : l);
      }
      
      const newLine: Line = {
        type,
        itemId: type === 'item' ? id : undefined,
        serviceId: type === 'service' ? id : undefined,
        quantity: 1,
        unitPrice: Number(target.price || target.sellingPrice || 0)
      };
      
      // If the last line is empty and of same type, replace it
      const lastLine = prev[prev.length - 1];
      const isEmpty = lastLine && !lastLine.itemId && !lastLine.serviceId;
      
      if (isEmpty) {
        return [...prev.slice(0, -1), newLine];
      }
      
      return [...prev, newLine];
    });
  };

  // Combine items and services for search
  const searchableOptions = [
    ...items.map(i => ({ 
      ...i, 
      type: 'item' as const, 
      label: `${i.name} (${i.sku})`,
      categoryName: i.category?.name || 'Uncategorized',
      searchString: `${i.name} ${i.sku} ${i.category?.name || ''}`.toLowerCase()
    })),
    ...services.map(s => ({ 
      ...s, 
      type: 'service' as const, 
      label: s.name,
      categoryName: 'Services',
      searchString: `${s.name} service`.toLowerCase()
    }))
  ];

  // Sale total = original price for items (so partial payment balance is correct), selling price for services
  const computedTotal = lines.reduce((sum, l) => {
    if (!((l.type === 'item' && l.itemId) || (l.type === 'service' && l.serviceId)) || l.quantity <= 0) return sum;
    return sum + l.quantity * Number(l.unitPrice || 0);
  }, 0);
  const displayAmountPaid = amountPaid === '' ? (computedTotal > 0 ? computedTotal : '') : amountPaid;

  const sell = async () => {
    setSellError('');
    const valid = lines.filter((l) => 
      ((l.type === 'item' && l.itemId) || (l.type === 'service' && l.serviceId)) && 
      l.quantity > 0 && 
      l.unitPrice >= 0
    );
    if (!valid.length) return;
    setSelling(true);
    setSellError('');
    try {
      // Use the unit price entered by the user
      const total = valid.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0);
      // Always send amountPaid explicitly: use entered value or full total (so partial payment is never lost)
      const paid = amountPaid === '' || amountPaid === undefined
        ? total
        : Math.max(0, Math.min(Number(amountPaid), total));
      await api.post('/reception/sell', {
        lines: valid.map((l) => ({
          itemId: l.type === 'item' ? l.itemId : undefined,
          serviceId: l.type === 'service' ? l.serviceId : undefined,
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
        })),
        amountPaid: paid,
        customerName: customerName || undefined,
        notes: notes || undefined,
        paymentMethod: paymentMethod || 'cash',
      });
      setLines([{ type: 'item', itemId: '', quantity: 1, unitPrice: 0 }]);
      setCustomerName('');
      setNotes('');
      setPaymentMethod('cash');
      setAmountPaid('');
      load();
    } catch (err: unknown) {
      const errorData = (err as any)?.response?.data;
      const msg = errorData?.message || 'Sale could not be completed. Please try again.';
      const trace = errorData?.trace ? ` | TRACE: ${errorData.trace.substring(0, 500)}...` : '';
      setSellError(`${Array.isArray(msg) ? msg.join(' ') : msg}${trace}`);
      setTimeout(() => setSellError(''), 20000); // 20s for long trace reading
    } finally {
      setSelling(false);
    }
  };

  const handlePayLater = async () => {
    if (!payDialogSale?.id) return;
    const balance = Number(payDialogSale.balanceDue ?? (Number(payDialogSale.totalAmount) - Number(payDialogSale.amountPaid ?? payDialogSale.totalAmount)));
    const amount = Number(payAmount);
    if (amount <= 0 || amount > balance) {
      setPayError(`Enter an amount between 0.01 and ${balance.toFixed(2)} birr.`);
      return;
    }
    setPaying(true);
    setPayError('');
    try {
      await api.post(`/reception/sales/${payDialogSale.id}/pay`, { amount, paymentMethod: payMethod });
      setPayDialogSale(null);
      setPayAmount('');
      load();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const msg = Array.isArray(res) ? res.join(' ') : res || 'Payment could not be recorded.';
      setPayError(msg);
    } finally {
      setPaying(false);
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
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>Reception – Sell items</Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>New sale</Typography>
              <TextField 
                label="Scan barcode" 
                value={barcodeInput}
                onChange={(e) => handleBarcodeInputChange(e.target.value)}
                onKeyPress={handleBarcodeKeyPress}
                inputRef={barcodeInputRef}
                fullWidth 
                variant="filled"
                sx={{ 
                  mb: 2,
                  '& .MuiFilledInput-root': {
                    backgroundColor: 'rgba(79, 70, 229, 0.04)',
                    borderRadius: 3,
                    border: '1px solid rgba(79, 70, 229, 0.08)',
                    '&:hover': { backgroundColor: 'rgba(79, 70, 229, 0.08)' },
                    '&.Mui-focused': { backgroundColor: 'rgba(79, 70, 229, 0.08)', borderColor: 'rgba(79, 70, 229, 0.3)' },
                    '&:before, &:after': { display: 'none' }
                  }
                }}
                placeholder="Scan or enter barcode"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => setCameraOpen(true)} color="primary">
                        <QrCodeScannerIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                disabled={scanningBarcode}
                helperText={
                  scanningBarcode
                    ? 'Scanning...'
                    : 'Use a barcode scanner or tap the icon to scan with camera'
                }
              />

              <Autocomplete
                fullWidth
                options={searchableOptions}
                groupBy={(option) => option.categoryName}
                getOptionLabel={(option) => option.label}
                value={searchValue}
                filterOptions={(options, { inputValue }) => {
                  const query = inputValue.toLowerCase();
                  return options.filter(o => o.searchString.includes(query));
                }}
                onChange={(_, value) => {
                  if (value) {
                    handleSelectItem(value);
                    setSearchValue(null);
                  }
                }}
                PaperComponent={(props) => (
                  <Paper {...props} elevation={12} sx={{ 
                    borderRadius: 3, 
                    mt: 1, 
                    overflow: 'hidden',
                    border: '1px solid rgba(79, 70, 229, 0.1)',
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                  }} />
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Item or Category"
                    placeholder="Type first letter to see products..."
                    variant="outlined"
                    sx={{ 
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(79, 70, 229, 0.02)',
                        transition: 'all 0.2s ease',
                        '& fieldset': { borderColor: 'rgba(79, 70, 229, 0.15)' },
                        '&:hover fieldset': { borderColor: 'rgba(79, 70, 229, 0.3)' },
                        '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
                      }
                    }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.id} sx={{ px: 2, py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Avatar 
                        src={option.type === 'item' ? option.imageUrl : undefined} 
                        variant="rounded"
                        sx={{ bgcolor: option.type === 'item' ? 'primary.light' : 'secondary.light', width: 40, height: 40 }}
                      >
                        {option.type === 'item' ? <ShoppingBagIcon /> : <BoltIcon />}
                      </Avatar>
                      <ListItemText 
                        primary={option.name}
                        secondary={option.type === 'item' ? `SKU: ${option.sku} • ${Number(option.price).toFixed(2)} birr` : `Service • ${Number(option.sellingPrice || option.price || 0).toFixed(2)} birr`}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                      {option.type === 'item' && option.categoryName !== 'Uncategorized' && (
                        <Chip label={option.categoryName} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                      )}
                    </Box>
                  </Box>
                )}
              />

              <TextField label="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} fullWidth sx={{ mb: 2 }} variant="standard" />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Order Items</Typography>
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => setLines([{ type: 'item', itemId: '', quantity: 1, unitPrice: 0 }])}
                  startIcon={<DeleteIcon />}
                  disabled={lines.length === 1 && !lines[0].itemId && !lines[0].serviceId}
                >
                  Clear All
                </Button>
              </Box>

              <Box sx={{ minHeight: 100, maxHeight: 400, overflowY: 'auto', pr: 1, mb: 2 }}>
                {lines.map((line, idx) => (
                  <Fade in key={idx}>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1, 
                      mb: 1.5, 
                      flexWrap: 'wrap', 
                      alignItems: 'center',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(0,0,0,0.02)',
                      border: '1px solid rgba(0,0,0,0.05)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                    }}>
                      <Select
                        size="small"
                        variant="standard"
                        value={line.type}
                        onChange={(e) => {
                          const newType = e.target.value as 'item' | 'service';
                          setLines((p) => p.map((l, i) => 
                            i === idx 
                              ? { type: newType, itemId: newType === 'item' ? '' : undefined, serviceId: newType === 'service' ? '' : undefined, quantity: l.quantity, unitPrice: 0 }
                              : l
                          ));
                        }}
                        sx={{ minWidth: 80, fontSize: '0.875rem' }}
                      >
                        <MenuItem value="item">Item</MenuItem>
                        <MenuItem value="service">Service</MenuItem>
                      </Select>
                      
                      {line.type === 'item' ? (
                        <Autocomplete
                          size="small"
                          options={items}
                          getOptionLabel={(i) => i.name}
                          value={items.find(i => i.id === line.itemId) || null}
                          onChange={(_, item) => {
                            setLines((p) => p.map((l, i) => (i === idx ? { ...l, itemId: item?.id || '', unitPrice: item ? Number(item.price) : 0 } : l)));
                          }}
                          sx={{ minWidth: 200, flex: '2 1 150px' }}
                          renderInput={(params) => <TextField {...params} placeholder="Select item" variant="standard" />}
                        />
                      ) : (
                        <Autocomplete
                          size="small"
                          options={services}
                          getOptionLabel={(s) => s.name}
                          value={services.find(s => s.id === line.serviceId) || null}
                          onChange={(_, service) => {
                            setLines((p) => p.map((l, i) => (i === idx ? { ...l, serviceId: service?.id || '', unitPrice: service ? Number(service.sellingPrice || service.price || 0) : l.unitPrice } : l)));
                          }}
                          sx={{ minWidth: 200, flex: '2 1 150px' }}
                          renderInput={(params) => <TextField {...params} placeholder="Select service" variant="standard" />}
                        />
                      )}
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField 
                          type="number" 
                          size="small" 
                          label="Qty"
                          value={line.quantity} 
                          onChange={(e) => setLines((p) => p.map((l, i) => (i === idx ? { ...l, quantity: Number(e.target.value) } : l)))} 
                          inputProps={{ min: 1 }} 
                          sx={{ width: 60 }}
                          variant="standard"
                        />
                        <TextField
                          type="number"
                          size="small"
                          label="Price"
                          value={line.unitPrice || ''}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            setLines((p) => p.map((l, i) => (i === idx ? { ...l, unitPrice: raw } : l)));
                          }}
                          placeholder="Price"
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 80 }}
                          variant="standard"
                        />
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => setLines((p) => p.filter((_, i) => i !== idx || p.length > 1))}
                          disabled={lines.length === 1 && !line.itemId && !line.serviceId}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Fade>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => addLine('item')}
                  startIcon={<AddIcon />}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Add Item Row
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => addLine('service')}
                  startIcon={<BoltIcon />}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Add Service Row
                </Button>
              </Box>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  label="Payment Method"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="mobile">Mobile Payment</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                type="number"
                label="Amount paid (birr)"
                value={displayAmountPaid}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') setAmountPaid('');
                  else {
                    const n = Number(v);
                    if (!Number.isNaN(n)) setAmountPaid(Math.max(0, Math.min(n, computedTotal || n)));
                  }
                }}
                helperText={computedTotal > 0 ? `Total: ${computedTotal.toFixed(2)} birr. Enter less for partial payment (customer pays rest later).` : undefined}
                inputProps={{ min: 0, max: computedTotal, step: 0.01 }}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth sx={{ mb: 2 }} />
              <Box sx={{ 
                p: 2, 
                borderRadius: 3, 
                bgcolor: 'rgba(79, 70, 229, 0.05)', 
                border: '1px solid rgba(79, 70, 229, 0.1)',
                mb: 2,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <Typography variant="h6" align="right" sx={{ mb: 1, color: 'primary.main', fontWeight: 700, letterSpacing: -0.5 }}>
                  Total: {computedTotal.toFixed(2)} birr
                </Typography>
                
                {sellError && (
                  <Fade in>
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{sellError}</Alert>
                  </Fade>
                )}

                <Button 
                  variant="contained" 
                  fullWidth 
                  onClick={sell} 
                  disabled={selling || computedTotal <= 0}
                  size="large"
                  sx={{ 
                    py: 1.5, 
                    borderRadius: 2, 
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)',
                      boxShadow: '0 6px 20px rgba(79, 70, 229, 0.23)',
                    },
                    '&.Mui-disabled': {
                      background: 'rgba(0,0,0,0.12)',
                    }
                  }}
                >
                  {selling ? 'Processing Sale...' : 'Complete Sale'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 4 }} sx={{ display: 'flex' }}>
              <Card
                sx={{
                  width: '100%',
                  minHeight: 82,
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  color: '#065f46',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', p: 1.25, height: '100%' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, mb: 0.5, color: 'inherit' }}>Revenue today</Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: '1.35rem', mb: 0.25, color: 'inherit' }}>{dashboard?.todayRevenue?.toFixed(2) ?? '0.00'}</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500, color: 'inherit', opacity: 0.9 }}>Total sales</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4 }} sx={{ display: 'flex' }}>
              <Card
                sx={{
                  width: '100%',
                  minHeight: 82,
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  color: '#1e40af',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', p: 1.25, height: '100%' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, mb: 0.5, color: 'inherit' }}>Transactions</Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: '1.35rem', mb: 0.25, color: 'inherit' }}>{dashboard?.todayTransactionCount ?? 0}</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500, color: 'inherit', opacity: 0.9 }}>Today</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4 }} sx={{ display: 'flex' }}>
              <Card
                sx={{
                  width: '100%',
                  minHeight: 82,
                  background: (dashboard?.lowStockCount ?? 0) > 0
                    ? 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'
                    : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  color: (dashboard?.lowStockCount ?? 0) > 0 ? '#9a3412' : '#475569',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', p: 1.25, height: '100%' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, mb: 0.5, color: 'inherit' }}>Low stock</Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: '1.35rem', mb: 0.25, color: 'inherit' }}>{dashboard?.lowStockCount ?? 0}</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500, color: 'inherit', opacity: 0.9 }}>Items</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Today&apos;s sales</Typography>
              {!dashboard?.todaysSales?.length ? (
                <Typography color="text.secondary">No sales today yet.</Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 320 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sale #</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Balance due</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.todaysSales.map((s) => {
                        const total = Number(s.totalAmount);
                        const paid = s.amountPaid !== undefined && s.amountPaid !== null ? Number(s.amountPaid) : total;
                        const balance = Number(s.balanceDue ?? Math.max(0, total - paid));
                        const hasBalance = balance > 0;
                        return (
                          <TableRow key={s.id}>
                            <TableCell>{s.saleNumber}</TableCell>
                            <TableCell>{s.soldAt ? new Date(s.soldAt).toLocaleTimeString() : '—'}</TableCell>
                            <TableCell align="right">{Number(s.totalAmount).toFixed(2)}</TableCell>
                            <TableCell align="right">{hasBalance ? `${balance.toFixed(2)} birr` : '—'}</TableCell>
                            <TableCell align="right">
                              {hasBalance ? (
                                <Button size="small" variant="outlined" onClick={() => { setPayDialogSale(s); setPayAmount(balance.toFixed(2)); setPayError(''); }}>
                                  Pay later
                                </Button>
                              ) : (
                                '—'
                              )}
                              <Button
                                size="small"
                                variant="text"
                                sx={{ ml: 0.5 }}
                                disabled={creatingInvoiceId === s.id}
                                onClick={async () => {
                                  setCreatingInvoiceId(s.id);
                                  try {
                                    await api.post('/invoices/from-sale', { saleId: s.id });
                                    navigate('/invoices');
                                  } finally {
                                    setCreatingInvoiceId(null);
                                  }
                                }}
                              >
                                {creatingInvoiceId === s.id ? '…' : 'Invoice'}
                              </Button>
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
          {dashboard?.unpaidSales && dashboard.unpaidSales.length > 0 && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Outstanding balances (pay later)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Sales with unpaid balance from any day. Click to record a payment.</Typography>
                <TableContainer sx={{ maxHeight: 240 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sale #</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Balance due</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.unpaidSales.map((s) => {
                        const total = Number(s.totalAmount);
                        const paid = s.amountPaid !== undefined && s.amountPaid !== null ? Number(s.amountPaid) : total;
                        const balance = Number(s.balanceDue ?? Math.max(0, total - paid));
                        return (
                          <TableRow key={s.id}>
                            <TableCell>{s.saleNumber}</TableCell>
                            <TableCell>{s.soldAt ? new Date(s.soldAt).toLocaleDateString() : '—'}</TableCell>
                            <TableCell align="right">{balance.toFixed(2)} birr</TableCell>
                            <TableCell align="right">
                              <Button size="small" variant="outlined" onClick={() => { setPayDialogSale(s); setPayAmount(balance.toFixed(2)); setPayError(''); }}>
                                Pay
                              </Button>
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
        </Grid>
      </Grid>

      {/* Camera barcode scanner dialog */}
      <BarcodeScannerDialog 
        open={cameraOpen} 
        onClose={() => setCameraOpen(false)} 
        onScan={(text) => {
          handleBarcodeScan(text).finally(() => setCameraOpen(false));
        }} 
      />

      <Dialog open={!!payDialogSale} onClose={() => !paying && setPayDialogSale(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Pay balance</DialogTitle>
        <DialogContent>
          {payDialogSale && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">Sale {payDialogSale.saleNumber}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>Balance due: <strong>{(Number(payDialogSale.balanceDue ?? (Number(payDialogSale.totalAmount) - Number(payDialogSale.amountPaid ?? payDialogSale.totalAmount)))).toFixed(2)} birr</strong></Typography>
              <TextField
                type="number"
                label="Amount to pay (birr)"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                fullWidth
                sx={{ mt: 2 }}
                inputProps={{ min: 0.01, step: 0.01 }}
              />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Payment method</InputLabel>
                <Select value={payMethod} label="Payment method" onChange={(e) => setPayMethod(e.target.value)}>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="mobile">Mobile Payment</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              {payError && <Alert severity="error" sx={{ mt: 2 }}>{payError}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogSale(null)} disabled={paying}>Cancel</Button>
          <Button variant="contained" onClick={handlePayLater} disabled={paying}>{paying ? 'Recording…' : 'Record payment'}</Button>
        </DialogActions>
      </Dialog>

      {(dashboard?.lowStockItems?.length ?? 0) > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Low stock alert</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Reorder level</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard?.lowStockItems?.map((i) => (
                    <TableRow key={i.sku}>
                      <TableCell>{i.sku}</TableCell>
                      <TableCell>{i.name}</TableCell>
                      <TableCell align="right">{i.currentStock}</TableCell>
                      <TableCell align="right">{i.reorderLevel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
