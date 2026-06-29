import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UpdateIcon from '@mui/icons-material/Update';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type License = {
  id: string;
  licenseKey: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  computerId: string;
  startDate: string;
  expiryDate: string;
  status: string;
  tenantId?: string;
  tenantName?: string;
};

type Customer = { id: string; name: string; email: string };

export default function Licenses() {
  const { computerId, user } = useAuth();
  const isDealer = user?.role === 'dealer';
  const [licenses, setLicenses] = useState<License[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [extendKey, setExtendKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [durationMode, setDurationMode] = useState<'duration' | 'expiry'>('duration');
  const [form, setForm] = useState({ 
    customerId: '', 
    computerId: '', 
    durationValue: 1,
    durationUnit: 'year' as 'day' | 'month' | 'year',
    expiryDate: ''
  });
  const [extendMode, setExtendMode] = useState<'duration' | 'expiry'>('duration');
  const [extendForm, setExtendForm] = useState({
    durationValue: 1,
    durationUnit: 'year' as 'day' | 'month' | 'year',
    expiryDate: ''
  });
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  const fetchLicenses = () =>
    api.get<License[]>(isDealer ? '/license/dealer-all' : '/license')
      .then((r) => setLicenses(r.data))
      .catch(() => setLicenses([]));
  const fetchCustomers = () => api.get<Customer[]>('/customers').then((r) => setCustomers(r.data)).catch(() => setCustomers([]));

  useEffect(() => {
    Promise.all([fetchLicenses(), fetchCustomers()]).finally(() => setLoading(false));
  }, []);

  const handleOpenGenerate = () => {
    setEditingLicense(null);
    setDurationMode('duration');
    setForm({ 
      customerId: '', 
      computerId: '', 
      durationValue: 1,
      durationUnit: 'year',
      expiryDate: ''
    });
    setError('');
    setOpen(true);
  };

  const handleGenerate = async () => {
    setError('');
    
    // Validation
    if (!form.customerId || !form.computerId) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (durationMode === 'expiry' && !form.expiryDate) {
      setError('Please select an expiry date');
      return;
    }
    
    if (durationMode === 'duration' && (!form.durationValue || form.durationValue <= 0)) {
      setError('Duration must be greater than 0');
      return;
    }
    
    try {
      const payload: any = {
        customerId: form.customerId,
        computerId: form.computerId,
      };
      
      if (durationMode === 'expiry' && form.expiryDate) {
        payload.expiryDate = form.expiryDate;
      } else {
        payload.duration = Number(form.durationValue);
        payload.durationUnit = form.durationUnit;
      }
      
      console.log('Generating license with payload:', payload);
      await api.post('/license/generate', payload);
      setOpen(false);
      setEditingLicense(null);
      setForm({ 
        customerId: '', 
        computerId: '', 
        durationValue: 1,
        durationUnit: 'year',
        expiryDate: ''
      });
      fetchLicenses();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to generate license');
    }
  };

  const handleUpdate = async () => {
    if (!editingLicense) return;
    setError('');
    
    // Validation
    if (!form.customerId || !form.computerId) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (durationMode === 'expiry' && !form.expiryDate) {
      setError('Please select an expiry date');
      return;
    }
    
    if (durationMode === 'duration' && (!form.durationValue || form.durationValue <= 0)) {
      setError('Duration must be greater than 0');
      return;
    }
    
    try {
      const payload: any = {
        id: editingLicense.id,
        customerId: form.customerId,
        computerId: form.computerId,
      };
      
      if (durationMode === 'expiry' && form.expiryDate) {
        payload.expiryDate = form.expiryDate;
      } else if (durationMode === 'duration') {
        payload.duration = Number(form.durationValue);
        payload.durationUnit = form.durationUnit;
      }
      
      console.log('Updating license with payload:', payload);
      const licenseId = editingLicense.id;
      const response = await api.post('/license/update', payload);
      console.log('Update response:', response.data);
      console.log('Updated expiry date:', response.data?.expiryDate);
      console.log('Updated start date:', response.data?.startDate);
      
      // Close dialog first
      setOpen(false);
      setEditingLicense(null);
      
      // Immediately refresh the licenses list
      await fetchLicenses();
      console.log('Licenses list refreshed');
      
      // Verify the update by fetching again
      const verifyResponse = await api.get<License[]>('/license');
      const updatedLicense = verifyResponse.data.find(l => l.id === licenseId);
      console.log('License after refresh:', updatedLicense);
      console.log('Expiry date in list:', updatedLicense?.expiryDate);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      console.error('Update error:', err);
      setError(err.response?.data?.message || 'Failed to update license');
    }
  };

  const handleExtend = async (key: string) => {
    setError('');
    
    // Validation
    if (extendMode === 'expiry' && !extendForm.expiryDate) {
      setError('Please select an expiry date');
      return;
    }
    
    if (extendMode === 'duration' && (!extendForm.durationValue || extendForm.durationValue <= 0)) {
      setError('Duration must be greater than 0');
      return;
    }
    
    try {
      const payload: any = { licenseKey: key };
      
      if (extendMode === 'expiry' && extendForm.expiryDate) {
        payload.expiryDate = extendForm.expiryDate;
      } else {
        payload.duration = Number(extendForm.durationValue);
        payload.durationUnit = extendForm.durationUnit;
      }
      
      console.log('Extending license with payload:', payload);
      await api.post('/license/extend', payload);
      setExtendKey(null);
      setExtendForm({
        durationValue: 1,
        durationUnit: 'year',
        expiryDate: ''
      });
      fetchLicenses();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      console.error('Extend error:', err);
      setError(err.response?.data?.message || 'Failed to extend license');
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Licenses</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenGenerate} disabled={customers.length === 0}>
          Generate License
        </Button>
      </Box>
      {customers.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Add customers first, then generate licenses for them.
        </Alert>
      )}
      <Paper sx={{ overflow: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>License Key</TableCell>
              {isDealer && <TableCell>Company / Tenant</TableCell>}
              <TableCell>Customer</TableCell>
              <TableCell>Computer ID</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>Expiry</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {licenses.map((l) => (
              <TableRow key={l.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{l.licenseKey}</TableCell>
                {isDealer && (
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{l.tenantName || '—'}</Typography>
                  </TableCell>
                )}
                <TableCell>
                  {l.customerName
                    ? <>{l.customerName}<br /><Typography variant="caption" color="text.secondary">{l.customerEmail}</Typography></>
                    : <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Tenant license</Typography>
                  }
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.computerId.slice(0, 8)}...</TableCell>
                <TableCell>{formatDate(l.startDate)}</TableCell>
                <TableCell>{formatDate(l.expiryDate)}</TableCell>
                <TableCell>
                  <Chip label={l.status} size="small" color={l.status === 'active' ? 'success' : l.status === 'expired' ? 'error' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    sx={{ mr: 1 }}
                    onClick={() => {
                      setEditingLicense(l);
                      setDurationMode('duration');
                      setForm({
                        customerId: l.customerId,
                        computerId: l.computerId,
                        durationValue: 1,
                        durationUnit: 'year',
                        expiryDate: ''
                      });
                      setError('');
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  {l.status === 'active' && (
                    <Button size="small" startIcon={<UpdateIcon />} onClick={() => setExtendKey(l.licenseKey)}>
                      Extend
                    </Button>
                  )}
                  {l.status === 'expired' && (
                    <Button size="small" onClick={() => handleExtend(l.licenseKey)}>Renew</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLicense ? 'Edit License' : 'Generate New License'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Customer</InputLabel>
            <Select
              value={form.customerId}
              label="Customer"
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name} ({c.email})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Computer ID"
            fullWidth
            required
            value={form.computerId}
            onChange={(e) => setForm((f) => ({ ...f, computerId: e.target.value }))}
            margin="normal"
            helperText="Get this from the login page of the client machine"
          />
          
          <Box sx={{ mt: 2, mb: 1 }}>
            <ToggleButtonGroup
              value={durationMode}
              exclusive
              onChange={(_, newMode) => newMode && setDurationMode(newMode)}
              fullWidth
              size="small"
            >
              <ToggleButton value="duration">Duration</ToggleButton>
              <ToggleButton value="expiry">Expiry Date</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {durationMode === 'duration' ? (
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                label="Duration"
                type="number"
                fullWidth
                value={form.durationValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setForm((f) => ({ ...f, durationValue: 0 }));
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setForm((f) => ({ ...f, durationValue: num }));
                    }
                  }
                }}
                inputProps={{ min: 0.01, step: 0.01 }}
                sx={{ flex: 2 }}
                required
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={form.durationUnit}
                  label="Unit"
                  onChange={(e) => setForm((f) => ({ ...f, durationUnit: e.target.value as 'day' | 'month' | 'year' }))}
                >
                  <MenuItem value="day">Day(s)</MenuItem>
                  <MenuItem value="month">Month(s)</MenuItem>
                  <MenuItem value="year">Year(s)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          ) : (
            <TextField
              label="Expiry Date"
              type="date"
              fullWidth
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().split('T')[0] }}
            />
          )}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={editingLicense ? handleUpdate : handleGenerate}>
              {editingLicense ? 'Save Changes' : 'Generate'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {extendKey && (
        <Dialog open={!!extendKey} onClose={() => setExtendKey(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Extend License (Renewal)</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Box sx={{ mt: 1, mb: 2 }}>
              <ToggleButtonGroup
                value={extendMode}
                exclusive
                onChange={(_, newMode) => newMode && setExtendMode(newMode)}
                fullWidth
                size="small"
              >
                <ToggleButton value="duration">Duration</ToggleButton>
                <ToggleButton value="expiry">Expiry Date</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {extendMode === 'duration' ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Extend by"
                  type="number"
                  fullWidth
                  value={extendForm.durationValue}
                  onChange={(e) => setExtendForm((f) => ({ ...f, durationValue: parseFloat(e.target.value) || 1 }))}
                  margin="normal"
                  inputProps={{ min: 0.01, step: 0.01 }}
                  sx={{ flex: 2 }}
                />
                <FormControl sx={{ flex: 1, mt: 1 }}>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={extendForm.durationUnit}
                    label="Unit"
                    onChange={(e) => setExtendForm((f) => ({ ...f, durationUnit: e.target.value as 'day' | 'month' | 'year' }))}
                  >
                    <MenuItem value="day">Day(s)</MenuItem>
                    <MenuItem value="month">Month(s)</MenuItem>
                    <MenuItem value="year">Year(s)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            ) : (
              <TextField
                label="New Expiry Date"
                type="date"
                fullWidth
                value={extendForm.expiryDate}
                onChange={(e) => setExtendForm((f) => ({ ...f, expiryDate: e.target.value }))}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            )}
            
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={() => {
                setExtendKey(null);
                setExtendForm({
                  durationValue: 1,
                  durationUnit: 'year',
                  expiryDate: ''
                });
              }}>Cancel</Button>
              <Button variant="contained" onClick={() => handleExtend(extendKey)}>Extend</Button>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
