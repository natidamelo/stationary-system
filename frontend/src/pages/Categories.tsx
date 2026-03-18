import { useEffect, useState } from 'react';
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
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Category = { id: string; name: string; description?: string };

const canEdit = (role: string) => ['admin', 'manager', 'inventory_clerk'].includes(role);

export default function Categories() {
  const { user } = useAuth();
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => api.get<Category[]>('/categories').then((r) => setList(r.data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      if (editingId) await api.put(`/categories/${editingId}`, form);
      else await api.post('/categories', form);
      setModal(false);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save category';
      alert(msg);
      console.error('Error saving category:', err);
    }
  };

  const openAdd = () => {
    setForm({ name: '', description: '' });
    setEditingId(null);
    setModal(true);
  };
  const openEdit = (c: Category) => {
    setForm({ name: c.name, description: c.description ?? '' });
    setEditingId(c.id);
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
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Categories</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {list.length} {list.length === 1 ? 'category' : 'categories'} total
          </Typography>
        </Box>
        {canEdit(user?.role ?? '') && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openAdd}>
            Add category
          </Button>
        )}
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                {canEdit(user?.role ?? '') && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', flexShrink: 0 }}>
                        <CategoryRoundedIcon sx={{ fontSize: '1rem' }} />
                      </Box>
                      <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{c.description || '—'}</Typography>
                  </TableCell>
                  {canEdit(user?.role ?? '') && (
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: 'text.secondary', '&:hover': { bgcolor: '#eef2ff', color: '#4f46e5' } }}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">No categories found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit category' : 'Add category'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} fullWidth multiline rows={2} />
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
