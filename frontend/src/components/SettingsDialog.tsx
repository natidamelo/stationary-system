import { useState, useRef, useEffect } from 'react';
import { typography } from '../theme/typography';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useSettings } from '../context/SettingsContext';

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { settings, updateSettings, uploadLogo } = useSettings();
  const [stationeryName, setStationeryName] = useState(settings.stationeryName);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStationeryName(settings.stationeryName);
      setLogoPreview(settings.logoUrl);
      setSelectedFile(null);
      setError(null);
    }
  }, [open, settings]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError(null);
    setUploading(true);

    try {
      // Update stationery name
      updateSettings({ stationeryName });

      // Upload logo if a new file was selected
      if (selectedFile) {
        await uploadLogo(selectedFile);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setLogoPreview(null);
    updateSettings({ logoUrl: null });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div" fontWeight={typography.fontWeightBold}>
          Settings
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Stationery Name */}
          <Box>
            <Typography variant="subtitle2" fontWeight={typography.fontWeightSemiBold} sx={{ mb: 1 }}>
              Stationery Name
            </Typography>
            <TextField
              fullWidth
              value={stationeryName}
              onChange={(e) => setStationeryName(e.target.value)}
              placeholder="Enter stationery name"
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              This name will appear in the sidebar and throughout the application
            </Typography>
          </Box>

          {/* Logo Upload */}
          <Box>
            <Typography variant="subtitle2" fontWeight={typography.fontWeightSemiBold} sx={{ mb: 1 }}>
              Logo / Photo
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={logoPreview || undefined}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2.5,
                  bgcolor: logoPreview ? 'transparent' : 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                  border: '2px solid #e5e7eb',
                }}
              >
                {!logoPreview && <PhotoCameraRoundedIcon sx={{ fontSize: '2rem', color: '#fff' }} />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PhotoCameraRoundedIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {logoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {logoPreview && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={handleRemoveLogo}
                      disabled={uploading}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Recommended: Square image, max 5MB (PNG, JPG, or GIF)
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={uploading} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={uploading || !stationeryName.trim()}
          startIcon={uploading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
        >
          {uploading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
