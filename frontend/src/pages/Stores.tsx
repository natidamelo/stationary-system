import { useEffect, useState } from 'react';
import { typography } from '../theme/typography';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
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
  CircularProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Store = {
  id: string;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
};

const canEdit = (role: string) => ['admin', 'dealer'].includes(role);

export default function Stores() {
  const { user } = useAuth();
  const [list, setList] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', isActive: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => api.get<Store[]>('/stores').then((r) => setList(r.data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      if (editingId) {
        await api.patch(`/stores/${editingId}`, form);
      } else {
        await api.post('/stores', form);
      }
      setModal(false);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save store';
      alert(msg);
      console.error('Error saving store:', err);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store?')) return;
    try {
      await api.delete(`/stores/${id}`);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete store';
      alert(msg);
      console.error('Error deleting store:', err);
    }
  };

  const openAdd = () => {
    setForm({ name: '', location: '', isActive: true });
    setEditingId(null);
    setModal(true);
  };

  const openEdit = (s: Store) => {
    setForm({ name: s.name, location: s.location ?? '', isActive: s.isActive });
    setEditingId(s.id);
    setModal(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={36} thickness={4} sx={{ color: '#4f46e5' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={typography.fontWeightBold} sx={{ letterSpacing: typography.pageTitle.letterSpacing }}>Store Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {list.length} {list.length === 1 ? 'store' : 'stores'} total
          </Typography>
        </Box>
        {canEdit(user?.role ?? '') && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openAdd}>
            Add Store
          </Button>
        )}
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Store Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                {canEdit(user?.role ?? '') && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <BusinessRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                    <Typography color="text.secondary" variant="body2">No stores registered yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell sx={{ fontWeight: typography.fontWeightSemiBold }}>{s.name}</TableCell>
                    <TableCell>{s.location || '-'}</TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: typography.fontWeightSemiBold,
                          bgcolor: s.isActive ? '#ecfdf5' : '#fef2f2',
                          color: s.isActive ? '#059669' : '#dc2626',
                        }}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Typography>
                    </TableCell>
                    <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    {canEdit(user?.role ?? '') && (
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(s)} sx={{ mr: 1, color: 'primary.main' }}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => remove(s.id)} sx={{ color: 'error.main' }}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Store' : 'Add Store'}</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <TextField
            autoFocus
            label="Store Name"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Location"
            fullWidth
            margin="normal"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          {editingId && (
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  color="primary"
                />
              }
              label="Is Active"
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save} variant="contained" disabled={!form.name.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
