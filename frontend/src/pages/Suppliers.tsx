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
  Avatar,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Supplier = { id: string; name: string; contactPerson?: string; email?: string; phone?: string; address?: string; isActive: boolean };

const canEdit = (role: string) => ['admin', 'manager', 'inventory_clerk'].includes(role);

export default function Suppliers() {
  const { user } = useAuth();
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => api.get<Supplier[]>('/suppliers').then((r) => setList(r.data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (editingId) await api.put(`/suppliers/${editingId}`, form);
    else await api.post('/suppliers', form);
    setModal(false);
    load();
  };

  const openAdd = () => {
    setForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
    setEditingId(null);
    setModal(true);
  };
  const openEdit = (s: Supplier) => {
    setForm({
      name: s.name,
      contactPerson: s.contactPerson ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: s.address ?? '',
    });
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

  const activeList = list.filter((s) => s.isActive !== false);

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={typography.fontWeightBold} sx={{ letterSpacing: typography.pageTitle.letterSpacing }}>Suppliers</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {activeList.length} active {activeList.length === 1 ? 'supplier' : 'suppliers'}
          </Typography>
        </Box>
        {canEdit(user?.role ?? '') && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openAdd}>
            Add supplier
          </Button>
        )}
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Supplier</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                {canEdit(user?.role ?? '') && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {activeList.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: '#ecfdf5', color: '#059669', fontSize: typography.body.fontSize, fontWeight: typography.fontWeightBold }}>
                        {s.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" fontWeight={typography.fontWeightSemiBold}>{s.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{s.contactPerson || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    {s.email ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EmailRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">{s.email}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.phone ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">{s.phone}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  {canEdit(user?.role ?? '') && (
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(s)} sx={{ color: 'text.secondary', '&:hover': { bgcolor: '#eef2ff', color: '#4f46e5' } }}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {activeList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">No suppliers found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
            <TextField label="Contact person" value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} fullWidth />
            <TextField type="email" label="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} fullWidth />
            <TextField label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} fullWidth />
            <TextField label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModal(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
