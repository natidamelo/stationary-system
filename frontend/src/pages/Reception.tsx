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
} from '@mui/material';
import { QrCodeScanner as QrCodeScannerIcon } from '@mui/icons-material';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

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
  const [items, setItems] = useState<Array<{ id: string; name: string; sku: string; price: number; barcode?: string }>>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string; sellingPrice: number; price?: number }>>([]);
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraScanning, setCameraScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const navigate = useNavigate();
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<string | null>(null);

  const load = () => {
    api.get<Dashboard>('/reception/dashboard').then((r) => setDashboard(r.data)).catch(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get<Dashboard>('/reception/dashboard').then((r) => setDashboard(r.data)),
      api.get<Array<{ id: string; name: string; sku: string; price: number; barcode?: string }>>('/items').then((r) => setItems(r.data)),
      api.get<Array<{ id: string; name: string; sellingPrice: number; price?: number }>>('/services').then((r) => setServices(r.data)),
    ]).catch(() => {})
      .finally(() => setLoading(false));

    // Cleanup timeout on unmount
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
      if (codeReaderRef.current) {
        try {
          (codeReaderRef.current as any).reset?.();
        } catch (e) {
          // Ignore reset errors during cleanup
        }
      }
    };
  }, []);

  // Start/stop camera scanning when dialog opens/closes
  useEffect(() => {
    if (!cameraOpen) {
      setCameraScanning(false);
      if (codeReaderRef.current) {
        try {
          (codeReaderRef.current as any).reset?.();
        } catch (e) {
          // Ignore reset errors when closing
        }
        codeReaderRef.current = null;
      }
      // Stop all video tracks when closing
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
      return;
    }

    setCameraError('');
    setCameraLoading(true);
    setCameraScanning(false);
    
    // Note: Browser will enforce secure context requirement automatically.
    // If using ngrok free tier, make sure to click through the warning page first.

    // Reduced delay for faster startup - dialog renders quickly
    const timer = setTimeout(async () => {
      const video = videoRef.current;
      if (!video) {
        console.error('❌ Video element not found');
        setCameraError('Video element not found. Please try again.');
        setCameraLoading(false);
        return;
      }

      // Check if BrowserMultiFormatReader is available
      if (typeof BrowserMultiFormatReader === 'undefined') {
        setCameraError('Barcode scanner library not loaded. Please refresh the page and try again.');
        setCameraLoading(false);
        return;
      }

      let cancelled = false;
      let started = false;
      let reader: BrowserMultiFormatReader | null = null;
      const CONFIRM_THRESHOLD = 2;
      let lastDetected = '';
      let detectCount = 0;

      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_39,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100,
        });
        codeReaderRef.current = reader;

        // Give user time to accept the browser permission dialog
        const startWatchdog = window.setTimeout(() => {
          if (!cancelled && !started) {
            setCameraLoading(false);
            setCameraError('Camera is taking too long to start. Please allow camera access when prompted, then try again.');
          }
        }, 60000);

        // Ensure video element is ready
        if (!video) {
          setCameraError('Video element not available. Please try again.');
          setCameraLoading(false);
          return;
        }

        const onVideoPlaying = () => {
          video.removeEventListener('playing', onVideoPlaying);
        };
        video.addEventListener('playing', onVideoPlaying);
        
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            focusMode: { ideal: 'continuous' },
          } as MediaTrackConstraints,
        };

        reader
          .decodeFromConstraints(constraints, video, (result, err, controls) => {
            if (!started) {
              started = true;
              window.clearTimeout(startWatchdog);
              setCameraLoading(false);
              setCameraScanning(true);
            }

            if (cancelled) {
              setCameraScanning(false);
              return;
            }

            if (err) {
              // NotFoundException and NotFoundException2 are normal - they just mean no barcode detected yet
              // The scanner continuously scans frames and throws these when no barcode is found
              if (err.name === 'NotFoundException' || err.name === 'NotFoundException2') {
                return; // Normal — no barcode in this frame
              }

              // Only log and handle real errors
              console.error('Scan error:', err);
              const errorMessage = err.message || String(err);
              
              // Check for specific error types
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
              } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setCameraError('No camera found on this device.');
              } else if (err.name === 'NotReadableError') {
                setCameraError('Camera is already in use by another app. Close other apps and try again.');
              } else if (errorMessage.includes('MultiFormat Readers') || errorMessage.includes('No readers')) {
                // This is an initialization error from ZXing - only show if it's a real problem
                // Check if the error message indicates initialization failure vs just no detection
                if (errorMessage.includes('were able to detect')) {
                  // This is just "no barcode detected" - ignore it
                  return;
                }
                setCameraError('Barcode scanner initialization failed. Please refresh the page and try again.');
              } else {
                // Only show errors that aren't just "no barcode detected" messages
                const isDetectionError = errorMessage.toLowerCase().includes('not found') || 
                                       errorMessage.toLowerCase().includes('no code') ||
                                       (errorMessage.toLowerCase().includes('detect') && 
                                        errorMessage.toLowerCase().includes('unable'));
                
                if (!isDetectionError) {
                  setCameraError(`Camera error: ${errorMessage}`);
                }
              }
              return;
            }

            if (result) {
              const text = result.getText();
              
              if (!text || !text.trim()) {
                return;
              }
              
              const barcodeText = text.trim();
              
              // Require the same value N times consecutively to avoid misreads
              if (barcodeText === lastDetected) {
                detectCount++;
              } else {
                lastDetected = barcodeText;
                detectCount = 1;
              }
              
              if (detectCount < CONFIRM_THRESHOLD) {
                // Not confirmed yet — keep scanning
                return;
              }
              
              console.log('✅ Barcode confirmed:', barcodeText);
              
              // Stop scanning immediately
              cancelled = true;
              setCameraScanning(false);
              try {
                controls.stop();
              } catch (e) {
                // ignore
              }
              
              if (reader) {
                try { (reader as any).reset?.(); } catch (e) { /* ignore */ }
              }
              
              handleBarcodeScan(barcodeText).finally(() => {
                setCameraOpen(false);
              });
            }
          })
          .catch(async (err: any) => {
            if (err?.name === 'OverconstrainedError' && reader) {
              console.warn('Constraints not supported, falling back to default camera');
              try {
                await reader.decodeFromVideoDevice(undefined, video, (result, err2, controls) => {
                  if (!started) {
                    started = true;
                    window.clearTimeout(startWatchdog);
                    setCameraLoading(false);
                    setCameraScanning(true);
                  }
                  if (cancelled) { setCameraScanning(false); return; }
                  if (err2) {
                    if (err2.name === 'NotFoundException' || err2.name === 'NotFoundException2') return;
                    return;
                  }
                  if (result) {
                    const text = result.getText();
                    if (!text || !text.trim()) return;
                    const barcodeText = text.trim();
                    if (barcodeText === lastDetected) { detectCount++; } else { lastDetected = barcodeText; detectCount = 1; }
                    if (detectCount < CONFIRM_THRESHOLD) return;
                    cancelled = true;
                    setCameraScanning(false);
                    try { controls.stop(); } catch (_e) { /* ignore */ }
                    handleBarcodeScan(barcodeText).finally(() => setCameraOpen(false));
                  }
                });
                return;
              } catch (_fallbackErr) {
                // Fall through to error handling below
              }
            }

            window.clearTimeout(startWatchdog);
            setCameraLoading(false);
            console.error('Camera start error', err);
            const errorMessage = err?.message || String(err);
            
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
              setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
            } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
              setCameraError('No camera found on this device.');
            } else if (err?.name === 'NotReadableError') {
              setCameraError('Camera is already in use by another app. Close other apps and try again.');
            } else if (err?.name === 'SecurityError') {
              setCameraError('Camera requires HTTPS. If using ngrok, click through the warning page first, then try again.');
            } else if (err?.name === 'OverconstrainedError') {
              setCameraError('Camera settings are not supported by your device. Please try a different camera or browser.');
            } else if (errorMessage.includes('MultiFormat Readers') || errorMessage.includes('No readers')) {
              setCameraError('Barcode scanner initialization failed. Please refresh the page and try again.');
            } else {
              setCameraError('Could not start camera. Please check browser permissions and try again.');
            }
          });
      } catch (err: any) {
        setCameraLoading(false);
        console.error('Failed to initialize barcode reader', err);
        const errorMessage = err?.message || String(err);
        if (errorMessage.includes('MultiFormat Readers') || errorMessage.includes('No readers')) {
          setCameraError('Barcode scanner initialization failed. Please refresh the page and try again.');
        } else {
          setCameraError('Failed to initialize barcode scanner. Please try again.');
        }
      }
    }, 100); // Minimal delay - just enough for video element to be ready

    return () => {
      clearTimeout(timer);
      if (codeReaderRef.current) {
        try {
          (codeReaderRef.current as any).reset?.();
        } catch (e) {
          // Ignore reset errors during cleanup
        }
      }
      codeReaderRef.current = null;
      // Stop video tracks
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [cameraOpen]);

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
          setLines((prev) => [...prev, {
            type: 'item' as const,
            itemId: item.id,
            quantity: 1,
            unitPrice: Number(item.price) || 0,
          }]);
        }
        setBarcodeInput('');
        // Focus back on barcode input for next scan
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      } else {
        setSellError(`Item with barcode "${barcode}" not found.`);
        setTimeout(() => setSellError(''), 3000);
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
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
                sx={{ mb: 2 }}
                placeholder="Scan or enter barcode"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => setCameraOpen(true)}>
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
              <TextField label="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} fullWidth sx={{ mb: 2 }} />
              {lines.map((line, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Select
                    size="small"
                    value={line.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'item' | 'service';
                      setLines((p) => p.map((l, i) => 
                        i === idx 
                          ? { type: newType, itemId: newType === 'item' ? '' : undefined, serviceId: newType === 'service' ? '' : undefined, quantity: l.quantity, unitPrice: 0 }
                          : l
                      ));
                    }}
                    sx={{ minWidth: 100 }}
                  >
                    <MenuItem value="item">Item</MenuItem>
                    <MenuItem value="service">Service</MenuItem>
                  </Select>
                  {line.type === 'item' ? (
                    <Select
                      size="small"
                      value={line.itemId || ''}
                      onChange={(e) => {
                        const item = items.find((i) => i.id === e.target.value);
                        setLines((p) => p.map((l, i) => (i === idx ? { ...l, itemId: e.target.value, unitPrice: item ? Number(item.price) : 0 } : l)));
                      }}
                      displayEmpty
                      sx={{ minWidth: 220, flex: '2 1 200px' }}
                    >
                      <MenuItem value="">Select item</MenuItem>
                      {items.map((i) => (
                        <MenuItem key={i.id} value={i.id}>{i.sku} – {i.name}</MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <Select
                      size="small"
                      value={line.serviceId || ''}
                      onChange={(e) => {
                        const service = services.find((s) => s.id === e.target.value);
                        setLines((p) => p.map((l, i) => (i === idx ? { ...l, serviceId: e.target.value, unitPrice: service ? Number(service.sellingPrice || service.price || 0) : 0 } : l)));
                      }}
                      displayEmpty
                      sx={{ minWidth: 220, flex: '2 1 200px' }}
                    >
                      <MenuItem value="">Select service</MenuItem>
                      {services.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name} - {(s.sellingPrice || s.price || 0).toFixed(2)}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                  <TextField type="number" size="small" value={line.quantity} onChange={(e) => setLines((p) => p.map((l, i) => (i === idx ? { ...l, quantity: Number(e.target.value) } : l)))} inputProps={{ min: 1 }} sx={{ width: 70 }} />
                  <TextField
                    type="number"
                    size="small"
                    value={line.unitPrice || ''}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      setLines((p) => p.map((l, i) => (i === idx ? { ...l, unitPrice: raw } : l)));
                    }}
                    placeholder="Price"
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    sx={{ width: 90 }}
                  />
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button size="small" onClick={() => addLine('item')}>+ Item</Button>
                <Button size="small" onClick={() => addLine('service')}>+ Service</Button>
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
              {sellError && <Alert severity="error" sx={{ mb: 1 }}>{sellError}</Alert>}
              <Button variant="contained" onClick={sell} disabled={selling}>
                {selling ? 'Selling…' : 'Complete sale'}
              </Button>
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
      <Dialog open={cameraOpen} onClose={() => setCameraOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Scan barcode with camera</DialogTitle>
        <DialogContent>
          {cameraError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cameraError}
            </Alert>
          )}
          {!cameraError && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1, minHeight: 240, bgcolor: '#000', borderRadius: 2, position: 'relative' }}>
              <video
                ref={videoRef}
                style={{ 
                  width: '100%', 
                  maxHeight: 320, 
                  borderRadius: 8,
                  objectFit: 'contain',
                  display: 'block'
                }}
                muted
                autoPlay
                playsInline
              />
              {cameraLoading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <CircularProgress size={40} sx={{ color: 'white', mb: 1 }} />
                  <Typography variant="body2">Starting camera...</Typography>
                </Box>
              )}
              {scanningBarcode && !cameraLoading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  textAlign: 'center',
                  bgcolor: 'rgba(0,0,0,0.7)',
                  px: 2,
                  py: 1,
                  borderRadius: 1
                }}>
                  <Typography variant="body2" fontWeight={600}>Processing barcode...</Typography>
                </Box>
              )}
              {cameraScanning && !cameraLoading && !scanningBarcode && (
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: 16,
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  color: 'white',
                  textAlign: 'center',
                  bgcolor: 'rgba(0,0,0,0.6)',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: '#4ade80',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 }
                    }
                  }} />
                  <Typography variant="body2" fontWeight={500}>Scanning...</Typography>
                </Box>
              )}
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {cameraError 
              ? (cameraError.includes('HTTPS') 
                  ? 'If using ngrok, make sure you clicked through the warning page first. Then allow camera access when prompted.'
                  : 'Please allow camera access when prompted, or check your browser settings.')
              : 'Point your device\'s camera at the item barcode. The item will be added automatically once detected.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCameraOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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
