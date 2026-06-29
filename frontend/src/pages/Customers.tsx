import { useEffect, useState } from 'react';
import { typography } from '../theme/typography';
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
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { api } from '../api/client';

type Customer = {
  id: string;
  name: string;
  email: string;
  contact?: string;
  address?: string;
  notes?: string;
};

export default function Customers() {
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', contact: '', address: '', notes: '' });

  const fetchList = () => {
    api.get<Customer[]>('/customers').then((r) => setList(r.data)).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleOpen = (c?: Customer) => {
    if (c) {
      setEditId(c.id);
      setForm({ name: c.name, email: c.email, contact: c.contact || '', address: c.address || '', notes: c.notes || '' });
    } else {
      setEditId(null);
      setForm({ name: '', email: '', contact: '', address: '', notes: '' });
    }
    setError('');
    setOpen(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      if (editId) {
        await api.put(`/customers/${editId}`, form);
      } else {
        await api.post('/customers', form);
      }
      setOpen(false);
      fetchList();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to save');
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={typography.fontWeightBold} sx={{ letterSpacing: typography.pageTitle.letterSpacing }}>Customers</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Customer
        </Button>
      </Box>
      <Paper sx={{ overflow: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.contact || '-'}</TableCell>
                <TableCell>{c.address || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpen(c)}><EditIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Name" fullWidth required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} margin="normal" />
          <TextField label="Email" type="email" fullWidth required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} margin="normal" />
          <TextField label="Contact" fullWidth value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} margin="normal" />
          <TextField label="Address" fullWidth value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} margin="normal" />
          <TextField label="Notes" fullWidth multiline rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} margin="normal" />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>Save</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
