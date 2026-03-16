import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, Container, Grid, Paper, Stack, IconButton, useTheme, useMediaQuery } from '@mui/material';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';

const features = [
  {
    icon: <SecurityRoundedIcon sx={{ fontSize: 40 }} />,
    title: 'Isolated Workspaces',
    description: 'Every user gets a completely clean and private database for their own company data.',
    color: '#4f46e5'
  },
  {
    icon: <BarChartRoundedIcon sx={{ fontSize: 40 }} />,
    title: 'Real-time Analytics',
    description: 'Track stock levels, sales trends, and profit margins with beautiful, dynamic charts.',
    color: '#7c3aed'
  },
  {
    icon: <BoltRoundedIcon sx={{ fontSize: 40 }} />,
    title: 'Lightning Fast',
    description: 'Optimized performance ensures your staff can process sales and updates in milliseconds.',
    color: '#0891b2'
  },
  {
    icon: <BackupRoundedIcon sx={{ fontSize: 40 }} />,
    title: 'Secure & Reliable',
    description: 'Your data is encrypted and backed up automatically. Never lose a record again.',
    color: '#059669'
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#0f172a', 
      color: '#fff', 
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Background Glows */}
      <Box sx={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '60vw',
        height: '60vw',
        background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        zIndex: 0
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        zIndex: 0
      }} />

      {/* Navbar */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10 }}>
        <Box sx={{ py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 40, height: 40, 
              borderRadius: 1.5, 
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
            }}>
              <InventoryRoundedIcon />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              Stationery.AI
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            {!isMobile && (
              <Button component={RouterLink} to="/login" sx={{ color: '#cbd5e1', '&:hover': { color: '#fff' } }}>
                Sign In
              </Button>
            )}
            <Button 
              component={RouterLink} to="/register"
              variant="contained" 
              sx={{ 
                borderRadius: 2, 
                px: 3, 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                boxShadow: '0 8px 16px rgba(79,70,229,0.25)'
              }}
            >
              Get Started
            </Button>
          </Stack>
        </Box>

        {/* Hero Section */}
        <Box sx={{ pt: { xs: 8, md: 15 }, pb: 10, textAlign: 'center' }}>
          <Typography 
            variant={isMobile ? 'h3' : 'h1'} 
            fontWeight={900} 
            sx={{ 
              lineHeight: 1.1, 
              letterSpacing: '-0.04em',
              mb: 3,
              background: 'linear-gradient(to right, #fff 30%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            The Smarter Way to <br /> Manage Your Stationery
          </Typography>
          <Typography variant="h6" sx={{ color: '#94a3b8', maxWidth: 600, mx: 'auto', mb: 6, fontWeight: 400 }}>
            The all-in-one platform for inventory, sales, and multi-tenant management. 
            Send your unique link to others and they get their own private workspace instantly.
          </Typography>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={3} justifyContent="center">
            <Button 
              component={RouterLink} to="/register"
              size="large" 
              variant="contained" 
              sx={{ 
                px: 5, py: 2, 
                borderRadius: 3, 
                fontSize: '1.1rem', 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 12px 24px rgba(79,70,229,0.3)'
              }}
            >
              Create Free Workspace
            </Button>
            <Button 
              component={RouterLink} to="/login"
              size="large" 
              variant="outlined" 
              sx={{ 
                px: 5, py: 2, 
                borderRadius: 3, 
                fontSize: '1.1rem', 
                fontWeight: 700,
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.03)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.3)',
                  bgcolor: 'rgba(255,255,255,0.06)'
                }
              }}
            >
              Sign In to Account
            </Button>
          </Stack>
        </Box>

        {/* Features Section */}
        <Box sx={{ py: 10 }}>
          <Typography variant="h4" fontWeight={800} textAlign="center" sx={{ mb: 8, letterSpacing: '-0.02em' }}>
            Built for Scale & Security
          </Typography>
          <Grid container spacing={4}>
            {features.map((f, i) => (
              <Grid item xs={12} md={6} lg={3} key={i}>
                <Paper sx={{ 
                  p: 4, 
                  height: '100%', 
                  bgcolor: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 4,
                  transition: 'transform 0.3s ease, border-color 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    borderColor: 'rgba(79,70,229,0.3)',
                    bgcolor: 'rgba(255,255,255,0.04)'
                  }
                }}>
                  <Box sx={{ color: f.color, mb: 3 }}>
                    {f.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                    {f.title}
                  </Typography>
                  <Typography sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
                    {f.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Footer */}
        <Box sx={{ py: 6, borderTop: '1px solid rgba(255,255,255,0.05)', mt: 10, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            &copy; 2026 Stationery Management AI. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
