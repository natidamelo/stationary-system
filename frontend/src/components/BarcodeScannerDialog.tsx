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
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

interface BarcodeScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScannerDialog({ open, onClose, onScan }: BarcodeScannerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!open) {
      setScanning(false);
      if (codeReaderRef.current) {
        try { (codeReaderRef.current as any).reset?.(); } catch (e) {}
        codeReaderRef.current = null;
      }
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
      return;
    }

    setError('');
    setLoading(true);
    setScanning(false);

    const timer = setTimeout(async () => {
      const video = videoRef.current;
      if (!video) {
        setError('Video element not found.');
        setLoading(false);
        return;
      }

      let cancelled = false;
      let started = false;
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
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100,
        });
        codeReaderRef.current = reader;

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            focusMode: { ideal: 'continuous' } as any,
          },
        };

        // Note: decodeFromConstraints returns a Promise that resolves when scanning starts
        reader.decodeFromConstraints(constraints, video, (result, err, controls) => {
          if (!started) {
            started = true;
            setLoading(false);
            setScanning(true);
          }

          if (cancelled) return;

          if (err) {
            if (err.name === 'NotFoundException' || err.name === 'NotFoundException2') return;
            // Only log real errors
            return;
          }

          if (result) {
            const text = result.getText()?.trim();
            if (!text) return;

            if (text === lastDetected) {
              detectCount++;
            } else {
              lastDetected = text;
              detectCount = 1;
            }

            if (detectCount < CONFIRM_THRESHOLD) return;

            console.log('✅ Barcode confirmed:', text);
            cancelled = true;
            setScanning(false);
            try { 
              controls.stop(); 
              if (codeReaderRef.current) (codeReaderRef.current as any).reset?.();
            } catch (e) {}
            onScan(text);
          }
        }).catch(async (err: any) => {
            if (cancelled) return;
            if (err?.name === 'OverconstrainedError') {
                 console.warn('Constraints fail, fallback');
                 try {
                     await reader.decodeFromVideoDevice(undefined, video, (result, err2, controls) => {
                          if (!started) { started = true; setLoading(false); setScanning(true); }
                          if (cancelled) return;
                          if (err2) return;
                          if (result) {
                              const text = result.getText()?.trim();
                              if (!text) return;
                              if (text === lastDetected) detectCount++; else { lastDetected = text; detectCount = 1; }
                              if (detectCount < CONFIRM_THRESHOLD) return;
                              cancelled = true; setScanning(false);
                              try { controls.stop(); } catch (e) {}
                              onScan(text);
                          }
                     });
                     return;
                 } catch (e) {}
            }
            setLoading(false);
            setError(err.message || 'Failed to access camera.');
        });
      } catch (err: any) {
        setLoading(false);
        setError(err.message || 'Failed to initialize scanner.');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (codeReaderRef.current) {
        try { (codeReaderRef.current as any).reset?.(); } catch (e) {}
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Scan Barcode</DialogTitle>
      <DialogContent>
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          aspectRatio: '1/1', 
          bgcolor: '#000', 
          borderRadius: 4, 
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <video 
            ref={videoRef} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            playsInline
          />
          {(loading || !scanning) && !error && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', zIndex: 1 }}>
              <CircularProgress color="inherit" sx={{ mb: 2 }} />
              <Typography variant="body2" fontWeight={500}>Starting camera...</Typography>
            </Box>
          )}
          {error && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'rgba(0,0,0,0.8)', zIndex: 2 }}>
              <Alert severity="error" variant="filled" sx={{ borderRadius: 2 }}>{error}</Alert>
            </Box>
          )}
          {scanning && (
             <>
               <Box sx={{ 
                 position: 'absolute', 
                 top: '50%', 
                 left: '50%', 
                 transform: 'translate(-50%, -50%)', 
                 width: '75%', 
                 height: '35%', 
                 border: '2px solid rgba(79, 70, 229, 0.8)', 
                 borderRadius: 2, 
                 pointerEvents: 'none', 
                 boxShadow: '0 0 0 1000px rgba(0,0,0,0.4)',
                 zIndex: 1,
                 '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    width: '100%',
                    height: '2px',
                    background: 'rgba(239, 68, 68, 0.8)',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
                    animation: 'scan 2s infinite ease-in-out'
                 }
               }} />
               <style>{`
                 @keyframes scan {
                   0%, 100% { top: 10%; }
                   50% { top: 90%; }
                 }
               `}</style>
             </>
          )}
        </Box>
        <Typography variant="body2" sx={{ mt: 2.5, textAlign: 'center', color: 'text.secondary', fontWeight: 500 }}>
          Align barcode within the center frame
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" fullWidth sx={{ borderRadius: 2 }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
