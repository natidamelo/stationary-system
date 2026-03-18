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
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { api } from '../api/client';

type Tenant = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  adminName: string | null;
  adminEmail: string | null;
  licenseCount: number;
  activeLicenseCount: number;
};

type TenantLicense = {
  id: string;
  licenseKey: string;
  computerId: string;
  startDate: string;
  expiryDate: string;
  status: string;
};

function LicenseRow({ tenantId }: { tenantId: string }) {
  const [licenses, setLicenses] = useState<TenantLicense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TenantLicense[]>(`/tenants/${tenantId}/licenses`)
      .then((r) => setLicenses(r.data))
      .catch(() => setLicenses([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <CircularProgress size={20} sx={{ m: 2 }} />;
  if (licenses.length === 0) return (
    <Box sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">No licenses yet for this tenant.</Typography>
    </Box>
  );

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>License Key</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Computer ID</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Start</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Expiry</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {licenses.map((l) => (
          <TableRow key={l.id}>
            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.licenseKey}</TableCell>
            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
              {l.computerId.length > 12 ? l.computerId.slice(0, 12) + '…' : l.computerId}
            </TableCell>
            <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(l.startDate).toLocaleDateString()}</TableCell>
            <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(l.expiryDate).toLocaleDateString()}</TableCell>
            <TableCell>
              <Chip
                label={l.status}
                size="small"
                color={l.status === 'active' ? 'success' : l.status === 'expired' ? 'error' : 'warning'}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TenantRow({
  tenant,
  onDelete,
  onGiveLicense,
  onToggleStatus,
}: {
  tenant: Tenant;
  onDelete: (t: Tenant) => void;
  onGiveLicense: (t: Tenant) => void;
  onToggleStatus: (t: Tenant) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpRoundedIcon fontSize="small" /> : <KeyboardArrowDownRoundedIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
              }}
            >
              <BusinessRoundedIcon sx={{ fontSize: '1.1rem' }} />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600}>{tenant.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                Registered {new Date(tenant.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          {tenant.adminEmail ? (
            <Box>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                {tenant.adminName}
              </Typography>
              <Typography variant="caption" color="text.secondary">{tenant.adminEmail}</Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.disabled">—</Typography>
          )}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${tenant.activeLicenseCount} active`}
              size="small"
              color={tenant.activeLicenseCount > 0 ? 'success' : 'default'}
            />
            {tenant.licenseCount > tenant.activeLicenseCount && (
              <Typography variant="caption" color="text.secondary">
                ({tenant.licenseCount} total)
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Tooltip title={tenant.isActive ? "Click to deactivate tenant" : "Click to activate tenant"}>
            <Chip
              label={tenant.isActive ? 'Active' : 'Inactive'}
              size="small"
              color={tenant.isActive ? 'success' : 'error'}
              onClick={() => onToggleStatus(tenant)}
              sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { opacity: 0.8, transform: 'scale(1.05)' } }}
            />
          </Tooltip>
        </TableCell>
        <TableCell align="right">
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Tooltip title="Give License">
              <Button
                size="small"
                variant="contained"
                startIcon={<VpnKeyRoundedIcon fontSize="small" />}
                onClick={() => onGiveLicense(tenant)}
                sx={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  fontSize: '0.75rem',
                }}
              >
                Give License
              </Button>
            </Tooltip>
            <Tooltip title="Delete tenant and all its data">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(tenant)}
              >
                <DeleteRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, bgcolor: 'action.hover' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                LICENSES FOR {tenant.name.toUpperCase()}
              </Typography>
              <LicenseRow tenantId={tenant.id} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function RegisteredTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Give License dialog
  const [licenseTarget, setLicenseTarget] = useState<Tenant | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseError, setLicenseError] = useState('');
  const [licenseSuccess, setLicenseSuccess] = useState('');
  const [durationMode, setDurationMode] = useState<'duration' | 'expiry'>('duration');
  const [licenseForm, setLicenseForm] = useState({
    computerId: '',
    durationValue: 1,
    durationUnit: 'year' as 'day' | 'month' | 'year',
    expiryDate: '',
  });

  // Add Tenant dialog
  const [addModal, setAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addForm, setAddForm] = useState({
    companyName: '',
    fullName: '',
    email: '',
    password: '',
  });

  const fetchTenants = () => {
    setLoading(true);
    api.get<Tenant[]>('/tenants')
      .then((r) => setTenants(r.data))
      .catch(() => setError('Failed to load registered tenants'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/tenants/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchTenants();
    } catch (e: any) {
      setDeleteError(e.response?.data?.message || 'Failed to delete tenant');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (t: Tenant) => {
    try {
      await api.patch(`/tenants/${t.id}`, { isActive: !t.isActive });
      fetchTenants();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update tenant status');
    }
  };

  const handleGiveLicense = async () => {
    if (!licenseTarget) return;
    setLicenseLoading(true);
    setLicenseError('');
    setLicenseSuccess('');
    try {
      const payload: any = { computerId: licenseForm.computerId };
      if (durationMode === 'expiry') {
        payload.expiryDate = licenseForm.expiryDate;
      } else {
        payload.duration = licenseForm.durationValue;
        payload.durationUnit = licenseForm.durationUnit;
      }
      const res = await api.post(`/tenants/${licenseTarget.id}/give-license`, payload);
      setLicenseSuccess(`License generated: ${res.data.licenseKey}`);
      fetchTenants();
    } catch (e: any) {
      setLicenseError(e.response?.data?.message || 'Failed to generate license');
    } finally {
      setLicenseLoading(false);
    }
  };

  const openLicenseDialog = (t: Tenant) => {
    setLicenseTarget(t);
    setLicenseError('');
    setLicenseSuccess('');
    setDurationMode('duration');
    setLicenseForm({ computerId: '', durationValue: 1, durationUnit: 'year', expiryDate: '' });
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await api.post('/auth/register', addForm);
      setAddModal(false);
      setAddForm({ companyName: '', fullName: '', email: '', password: '' });
      fetchTenants();
    } catch (e: any) {
      setAddError(e.response?.data?.message || 'Failed to register tenant');
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Registered Tenants</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All businesses that have self-registered. Manage them and issue licenses here.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={`${tenants.length} tenant${tenants.length !== 1 ? 's' : ''}`}
            color="primary"
            sx={{ fontWeight: 700, height: 32 }}
          />
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setAddModal(true)}
            sx={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              fontWeight: 700,
            }}
          >
            Add Tenant
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tenants.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <BusinessRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No registered tenants yet</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
            Businesses will appear here once they register via the Register page.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ overflow: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50} />
                <TableCell>Company / Shop</TableCell>
                <TableCell>Admin User</TableCell>
                <TableCell>Licenses</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((t) => (
                <TenantRow
                  key={t.id}
                  tenant={t}
                  onDelete={setDeleteTarget}
                  onGiveLicense={openLicenseDialog}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Tenant</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will permanently delete <strong>{deleteTarget?.name}</strong> and all their users, data, and licenses.
            This cannot be undone.
          </Alert>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteRoundedIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Give License Dialog */}
      <Dialog open={!!licenseTarget} onClose={() => !licenseLoading && setLicenseTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Give License to {licenseTarget?.name}
        </DialogTitle>
        <DialogContent>
          {licenseError && <Alert severity="error" sx={{ mb: 2 }}>{licenseError}</Alert>}
          {licenseSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={700}>License created successfully!</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>{licenseSuccess.replace('License generated: ', '')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Share this key with the client — they'll enter it on their machine.
              </Typography>
            </Alert>
          )}
          <TextField
            label="Computer ID"
            fullWidth
            required
            value={licenseForm.computerId}
            onChange={(e) => setLicenseForm((f) => ({ ...f, computerId: e.target.value }))}
            margin="normal"
            placeholder="e.g. ABC-123-XYZ"
            helperText="The unique ID of the client's computer (shown on the login page)"
          />
          <Box sx={{ mt: 2, mb: 1 }}>
            <ToggleButtonGroup
              value={durationMode}
              exclusive
              onChange={(_, v) => v && setDurationMode(v)}
              fullWidth
              size="small"
            >
              <ToggleButton value="duration">Duration</ToggleButton>
              <ToggleButton value="expiry">Expiry Date</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {durationMode === 'duration' ? (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                label="Duration"
                type="number"
                fullWidth
                value={licenseForm.durationValue}
                onChange={(e) => setLicenseForm((f) => ({ ...f, durationValue: Number(e.target.value) || 1 }))}
                inputProps={{ min: 1 }}
                sx={{ flex: 2 }}
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={licenseForm.durationUnit}
                  label="Unit"
                  onChange={(e) => setLicenseForm((f) => ({ ...f, durationUnit: e.target.value as any }))}
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
              value={licenseForm.expiryDate}
              onChange={(e) => setLicenseForm((f) => ({ ...f, expiryDate: e.target.value }))}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().split('T')[0] }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLicenseTarget(null)} disabled={licenseLoading}>
            {licenseSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!licenseSuccess && (
            <Button
              variant="contained"
              onClick={handleGiveLicense}
              disabled={licenseLoading || !licenseForm.computerId}
              startIcon={licenseLoading ? <CircularProgress size={16} color="inherit" /> : <VpnKeyRoundedIcon />}
            >
              {licenseLoading ? 'Generating...' : 'Generate License'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Add New Tenant Dialog */}
      <Dialog open={addModal} onClose={() => !addLoading && setAddModal(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddTenant}>
          <DialogTitle sx={{ fontWeight: 700 }}>Add New Shop</DialogTitle>
          <DialogContent>
            {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Create a new shop and its owner account manually.
            </Typography>
            <TextField
              label="Shop Name"
              fullWidth
              required
              value={addForm.companyName}
              onChange={(e) => setAddForm((f) => ({ ...f, companyName: e.target.value }))}
              margin="dense"
            />
            <TextField
              label="Owner Full Name"
              fullWidth
              required
              value={addForm.fullName}
              onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
              margin="normal"
            />
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              margin="normal"
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={addForm.password}
              onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
              margin="normal"
              helperText="Owner will use this to log in"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddModal(false)} disabled={addLoading}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={addLoading}
              startIcon={addLoading ? <CircularProgress size={16} color="inherit" /> : <AddRoundedIcon />}
              sx={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              {addLoading ? 'Creating...' : 'Register Shop'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
