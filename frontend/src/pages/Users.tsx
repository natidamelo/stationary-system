import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Refresh as RefreshIcon, 
  Person as PersonIcon, 
  Delete as DeleteIcon, 
  Block as BlockIcon, 
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import { api } from '../api/client';

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  department?: string;
  role: { name: string };
  isActive: boolean;
};

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'inventory_clerk', label: 'Inventory Clerk' },
  { value: 'reception', label: 'Reception' },
];

export default function Users() {
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  
  const [passOpen, setPassOpen] = useState(false);
  const [passTarget, setPassTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [passError, setPassError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    department: '',
    roleName: 'employee',
  });

  const fetchUsers = () => {
    setLoading(true);
    api
      .get<UserRow[]>('/users')
      .then((r) => setList(r.data))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpen = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      department: '',
      roleName: 'employee',
    });
    setOpen(true);
    setError('');
  };

  const handleEdit = (user: UserRow) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '', // Password not included in edit profile
      department: user.department || '',
      roleName: user.role?.name || 'employee',
    });
    setOpen(true);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingUser) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...updateData } = formData;
        await api.patch(`/users/${editingUser.id}`, updateData);
      } else {
        await api.post('/users', formData);
      }
      handleClose();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${editingUser ? 'update' : 'create'} user`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/users/${id}/status`, { isActive: !currentStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passTarget) return;
    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters');
      return;
    }
    setPassSubmitting(true);
    setPassError('');
    try {
      await api.patch(`/users/${passTarget.id}/password`, { password: newPassword });
      setPassOpen(false);
      setNewPassword('');
      setPassTarget(null);
      alert('Password updated successfully');
    } catch (err: any) {
      setPassError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPassSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)',
            }}
          >
            <PersonIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              User Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage team members and their roles
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={fetchUsers}
            startIcon={<RefreshIcon />}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={handleOpen}
            startIcon={<AddIcon />}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
              },
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Full Name</TableCell>
              <TableCell>Email Address</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={24} sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Loading users...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
                    No users found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click "Add User" to create your first team member
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.department || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role?.name?.toUpperCase() || '-'}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        bgcolor: u.role?.name === 'admin' ? 'primary.light' : 'action.selected',
                        color: u.role?.name === 'admin' ? 'primary.main' : 'text.primary',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={u.isActive ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(u)}
                        title="Edit User"
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => { setPassTarget(u); setPassOpen(true); setPassError(''); setNewPassword(''); }}
                        title="Change Password"
                        color="info"
                      >
                        <VpnKeyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStatus(u.id, u.isActive)}
                        title={u.isActive ? 'Deactivate' : 'Activate'}
                        color={u.isActive ? 'warning' : 'success'}
                      >
                        {u.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(u.id)}
                        color="error"
                        title="Delete User"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit User Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
              <TextField
                label="Full Name"
                fullWidth
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {!editingUser && (
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  helperText="Minimum 6 characters"
                />
              )}
              <TextField
                label="Department"
                fullWidth
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
              <TextField
                select
                label="Role"
                fullWidth
                required
                value={formData.roleName}
                onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                minWidth: 120,
              }}
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passOpen} onClose={() => setPassOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handlePassSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>Change Password</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Changing password for <strong>{passTarget?.fullName}</strong>
            </Typography>
            {passError && <Alert severity="error" sx={{ mb: 2 }}>{passError}</Alert>}
            <TextField
              label="New Password"
              type="password"
              fullWidth
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Minimum 6 characters"
              autoFocus
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setPassOpen(false)} color="inherit">Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={passSubmitting}
            >
              {passSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Update Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
