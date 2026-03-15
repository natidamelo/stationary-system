import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Service = {
  id: string;
  name: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  price?: number;
  isActive: boolean;
};

const canEdit = (role: string) => ['admin', 'manager'].includes(role);

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState({ name: '', description: '', costPrice: 0, sellingPrice: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    return api.get<Service[]>('/services')
      .then((r) => setServices(r.data))
      .catch(() => setServices([]));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setForm({ name: '', description: '', costPrice: 0, sellingPrice: 0 });
    setEditingId(null);
    setModal('add');
  };
  
  const openEdit = (service: Service) => {
    setForm({
      name: service.name,
      description: service.description || '',
      costPrice: Number(service.costPrice || 0),
      sellingPrice: Number(service.sellingPrice || service.price || 0),
    });
    setEditingId(service.id);
    setModal('edit');
  };
  
  const save = async () => {
    const payload = { 
      ...form, 
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) 
    };
    try {
      if (editingId) {
        await api.put(`/services/${editingId}`, payload);
      } else {
        await api.post('/services', payload);
      }
      setModal(null);
      load();
    } catch (err) {
      console.error('Failed to save service', err);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>Services</Typography>
        {canEdit(user?.role ?? '') && (
          <Button variant="contained" onClick={openAdd}>Add service</Button>
        )}
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Cost Price</TableCell>
              <TableCell align="right">Selling Price</TableCell>
              {canEdit(user?.role ?? '') && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.description || '—'}</TableCell>
                <TableCell align="right">{Number(s.costPrice || 0).toFixed(2)}</TableCell>
                <TableCell align="right">{Number(s.sellingPrice || s.price || 0).toFixed(2)}</TableCell>
                {canEdit(user?.role ?? '') && (
                  <TableCell>
                    <Button size="small" onClick={() => openEdit(s)}>Edit</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={modal !== null} onClose={() => setModal(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{modal === 'add' ? 'Add service' : 'Edit service'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField 
              label="Name" 
              value={form.name} 
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} 
              fullWidth 
              required
            />
            <TextField 
              label="Description" 
              value={form.description} 
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} 
              fullWidth 
              multiline
              rows={3}
            />
            <TextField 
              type="number" 
              label="Cost Price" 
              value={form.costPrice} 
              onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))} 
              inputProps={{ min: 0, step: 0.01 }} 
              fullWidth 
              helperText="Internal cost of providing this service"
            />
            <TextField 
              type="number" 
              label="Selling Price" 
              value={form.sellingPrice} 
              onChange={(e) => setForm((f) => ({ ...f, sellingPrice: Number(e.target.value) }))} 
              inputProps={{ min: 0, step: 0.01 }} 
              fullWidth 
              required
              helperText="Price charged to customers"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.name || form.sellingPrice < 0 || form.costPrice < 0}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
