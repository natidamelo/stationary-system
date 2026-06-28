import { useEffect, useRef } from 'react';

interface UseUsbBarcodeScannerOptions {
  excludeIds?: string[];
}

/**
 * Custom hook to detect scans from USB barcode readers (which emulate keyboards).
 * Measures timing between keystrokes to differentiate from human typing,
 * and handles restoring polluted inputs.
 */
export function useUsbBarcodeScanner(
  onScan: (barcode: string) => void,
  options?: UseUsbBarcodeScannerOptions
) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const excludeIds = options?.excludeIds || [];
  
  // Use a ref for the callback to prevent keydown listener re-registration on state changes
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key combinations with Control, Alt, or Command
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // USB barcode readers send characters extremely rapidly (usually < 35ms intervals).
      // Humans typing very fast average 80ms+ per key. Let's use 50ms as a robust threshold.
      const isFast = timeDiff <= 50;

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        
        if (barcode.length >= 3) {
          // If the Enter is part of the fast sequence, intercept and handle it
          e.preventDefault();
          e.stopPropagation();

          bufferRef.current = '';

          // Clean up wedge scanner pollution in active input fields
          cleanActiveElement(barcode);

          onScanRef.current(barcode);
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Buffer printable characters (length of 1)
      if (e.key.length === 1) {
        // If it's the start of a sequence, or the keystroke arrived fast enough
        if (bufferRef.current === '' || isFast) {
          bufferRef.current += e.key;
        } else {
          // Gap was too long, reset the buffer and start new with this key
          bufferRef.current = e.key;
        }
      }
    };

    const cleanActiveElement = (barcode: string) => {
      const activeEl = document.activeElement;
      if (!activeEl) return;

      // Exclude specific fields (like the actual barcode or sku field in a form)
      if (excludeIds.includes(activeEl.id)) {
        return;
      }

      if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
        const val = activeEl.value;
        if (val.endsWith(barcode)) {
          const newVal = val.slice(0, -barcode.length);
          
          // Use native value setter to bypass React's virtual DOM setter,
          // then dispatch an 'input' event to trigger React's onChange state update.
          const prototype = activeEl instanceof HTMLInputElement 
            ? HTMLInputElement.prototype 
            : HTMLTextAreaElement.prototype;
          
          const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
          if (nativeValueSetter) {
            nativeValueSetter.call(activeEl, newVal);
            const event = new Event('input', { bubbles: true });
            activeEl.dispatchEvent(event);
          }
        }
      }
    };

    // Use capturing phase (third parameter = true) to intercept keypresses
    // before they hit active input elements.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [excludeIds]);
}
