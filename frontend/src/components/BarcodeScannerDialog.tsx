import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScannerDialog({ open, onClose, onScan }: BarcodeScannerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isMounted = true;
    let scanHandled = false;

    if (!open) {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(console.error);
        } else {
          try { scannerRef.current.clear(); } catch(e) {}
        }
        scannerRef.current = null;
      }
      return;
    }

    setLoading(true);
    setError('');
    scanHandled = false;

    // Give time for the modal DOM element to render
    timer = setTimeout(() => {
      if (!isMounted) return;
      try {
        const formats = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
        ];

        const scanner = new Html5Qrcode("reader-container", { formatsToSupport: formats, verbose: false });
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        };

        const handleSuccess = (decodedText: string) => {
          if (scanHandled) return;
          scanHandled = true; // Prevent rapid duplicate fires
          onScan(decodedText);
        };

        const handleError = () => {
          // Ignore normal non-detection parse errors
        };

        scanner.start({ facingMode: "environment" }, config, handleSuccess, handleError)
          .then(() => {
            if (isMounted) setLoading(false);
          })
          .catch((err) => {
            // Fallback for devices without a rear camera (like laptops/desktops)
            if (isMounted) {
              scanner.start({ facingMode: "user" }, config, handleSuccess, handleError)
                .then(() => {
                  if (isMounted) setLoading(false);
                })
                .catch((err2) => {
                  if (isMounted) {
                    setLoading(false);
                    setError(err2?.message || err?.message || "Failed to start camera. Make sure you granted permissions.");
                  }
                });
            }
          });
      } catch (err: any) {
        if (isMounted) {
          setLoading(false);
          setError(err?.message || "Failed to initialize scanner.");
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(console.error);
        } else {
          try { scannerRef.current.clear(); } catch(e) {}
        }
        scannerRef.current = null;
      }
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Scan Barcode</DialogTitle>
      <DialogContent>
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          aspectRatio: '1', 
          bgcolor: '#000', 
          borderRadius: 4, 
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Html5Qrcode will render here */}
          <div id="reader-container" style={{ width: '100%', height: '100%', border: 'none' }}></div>
          
          {loading && !error && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.8)', color: '#fff', zIndex: 10 }}>
              <CircularProgress color="inherit" sx={{ mb: 2 }} />
              <Typography variant="body2" fontWeight={500}>Accessing camera...</Typography>
            </Box>
          )}
          
          {error && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'rgba(0,0,0,0.9)', zIndex: 10 }}>
              <Alert severity="error" variant="filled" sx={{ borderRadius: 2 }}>{error}</Alert>
            </Box>
          )}

          {/* Add custom styling rules to make html5-qrcode ui nicer and fit our theme */}
          <style>{`
            #reader-container video {
              object-fit: cover !important;
            }
            #reader-container__scan_region img {
              display: none; /* If it injects any unwanted images */
            }
          `}</style>
        </Box>
        <Typography variant="body2" sx={{ mt: 2.5, textAlign: 'center', color: 'text.secondary', fontWeight: 500 }}>
          Hold the camera steady over the barcode.<br/>If it fails, try moving the device closer or further away.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" fullWidth sx={{ borderRadius: 2 }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
