import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, InputAdornment, IconButton, Link } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, computerId } = useAuth();

  const copyComputerId = () => {
    navigator.clipboard.writeText(computerId);
  };
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const errObj = err as { response?: { status?: number; data?: { message?: string | string[]; error?: string } } };
      if (!errObj.response) {
        setError('Cannot reach server. Make sure the backend is running and try again.');
        return;
      }
      const msg = errObj.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' ') : msg || errObj.response?.data?.error;
      if (text) {
        setError(text);
      } else if (errObj.response.status === 401) {
        setError('Invalid email or password, account disabled, or license invalid for this computer. Check credentials and license.');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0a2e 40%, #1e1b4b 100%)',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          top: '-200px',
          right: '-200px',
          borderRadius: '50%',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          bottom: '-150px',
          left: '-150px',
          borderRadius: '50%',
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 420,
          width: '100%',
          p: 4,
          borderRadius: 5,
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'fadeInUp 0.5s ease-out',
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(79,70,229,0.35)',
            }}
          >
            <InventoryRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              Stationery Management
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sign in to your account
            </Typography>
          </Box>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
            margin="normal"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailRoundedIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
            margin="normal"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockRoundedIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{
              mt: 3,
              py: 1.4,
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)',
                boxShadow: '0 6px 20px rgba(79,70,229,0.45)',
              },
            }}
          >
            Sign in
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" sx={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              Create one here
            </Link>
          </Typography>
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: '#f9fafb', borderRadius: 2.5, border: '1px solid #f3f4f6' }}>
          <Typography variant="caption" color="text.secondary" display="block" fontWeight={600} sx={{ mb: 0.5 }}>
            Computer ID (for license activation)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontFamily="'JetBrains Mono', monospace" sx={{ wordBreak: 'break-all', fontSize: '0.8rem', color: 'text.primary', flex: 1 }}>
              {computerId}
            </Typography>
            <Button
              size="small"
              startIcon={<ContentCopyIcon sx={{ fontSize: '0.9rem !important' }} />}
              onClick={copyComputerId}
              sx={{ minWidth: 0, px: 1.5, borderRadius: 2, fontSize: '0.75rem', color: '#4f46e5', bgcolor: '#eef2ff', '&:hover': { bgcolor: '#e0e7ff' } }}
            >
              Copy
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
