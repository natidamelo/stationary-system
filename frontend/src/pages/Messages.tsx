import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Avatar,
  Chip,
  IconButton,
  List,
  ListItem,
  Divider,
} from '@mui/material';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type UserRow = {
  id: string;
  fullName: string;
  role?: { name: string };
};

type Message = {
  id: string;
  senderId: string;
  recipientId: string | null;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  recipient: {
    id: string;
    fullName: string;
    role: string;
  } | null;
};

export default function Messages() {
  const { user } = useAuth();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sendType, setSendType] = useState<'all' | 'individual'>('all');
  const [recipientId, setRecipientId] = useState<string>('');
  const [content, setContent] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch users & messages
  const fetchData = async () => {
    try {
      const [msgRes, userRes] = await Promise.all([
        api.get<Message[]>('/messages'),
        api.get<UserRow[]>('/users'),
      ]);
      setMessages(msgRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error('Error fetching messages data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (sendType === 'individual' && !recipientId) {
      alert('Please select a recipient');
      return;
    }

    setSending(true);
    try {
      await api.post('/messages', {
        recipientId: sendType === 'individual' ? recipientId : null,
        content: content.trim(),
      });
      setContent('');
      if (sendType === 'individual') {
        setRecipientId('');
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Delete message (Admin only)
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message log? This action is tracked to preserve evidence.')) {
      return;
    }
    try {
      await api.delete(`/messages/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete message log');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Title Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
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
          <ForumRoundedIcon />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Message Center</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Send announcements and direct messages. Only administrators can delete logs to preserve evidence.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: New Message */}
        <Grid item xs={12} md={5} lg={4}>
          <Card sx={{ height: '100%', borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <MailOutlineIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>New Message</Typography>
              </Box>

              <form onSubmit={handleSend}>
                {/* Broadcast / Direct Toggle */}
                <ToggleButtonGroup
                  value={sendType}
                  exclusive
                  onChange={(e, val) => {
                    if (val !== null) setSendType(val);
                  }}
                  fullWidth
                  size="small"
                  sx={{ mb: 3 }}
                >
                  <ToggleButton value="all" sx={{ gap: 1, textTransform: 'none', fontWeight: 600, py: 1 }}>
                    <CampaignRoundedIcon fontSize="small" />
                    Send to All
                  </ToggleButton>
                  <ToggleButton value="individual" sx={{ gap: 1, textTransform: 'none', fontWeight: 600, py: 1 }}>
                    <PeopleAltRoundedIcon fontSize="small" />
                    Individual User
                  </ToggleButton>
                </ToggleButtonGroup>

                {/* Recipient Dropdown (if individual) */}
                {sendType === 'individual' && (
                  <FormControl fullWidth size="small" required sx={{ mb: 3 }}>
                    <InputLabel id="recipient-select-label">Recipient</InputLabel>
                    <Select
                      labelId="recipient-select-label"
                      id="recipient-select"
                      value={recipientId}
                      label="Recipient"
                      onChange={(e) => setRecipientId(e.target.value as string)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">
                        <em>Select a user...</em>
                      </MenuItem>
                      {users
                        .filter((u) => u.id !== user?.id)
                        .map((u) => (
                          <MenuItem key={u.id} value={u.id}>
                            {u.fullName} ({u.role?.name ? u.role.name.toUpperCase() : 'USER'})
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}

                {/* Message Content */}
                <TextField
                  label="Message Content"
                  placeholder="Type your message here..."
                  multiline
                  rows={6}
                  fullWidth
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    },
                  }}
                />

                {/* Send Button */}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={sending || loading}
                  startIcon={<SendRoundedIcon />}
                  sx={{
                    py: 1.25,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
                    },
                  }}
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Message History */}
        <Grid item xs={12} md={7} lg={8}>
          <Card sx={{ height: '100%', borderRadius: 4, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
              {/* Header with Evidence Mode Chip */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ForumRoundedIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>Message History</Typography>
                </Box>
                <Chip
                  icon={<ShieldRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
                  label="Evidence Mode (Admin Only Delete)"
                  size="small"
                  sx={{
                    bgcolor: '#eff6ff',
                    color: '#1e40af',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    border: '1px solid #dbeafe',
                    '& .MuiChip-icon': { color: '#3b82f6' }
                  }}
                />
              </Box>

              {/* Message List */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 600 }}>
                {messages.length === 0 ? (
                  <Box sx={{ py: 10, px: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <ForumRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                    <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                      No messages recorded yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Start a conversation or broadcast an announcement from the left panel.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {messages.map((m, index) => {
                      const senderInitial = m.sender?.fullName?.charAt(0).toUpperCase() || 'U';
                      const senderRole = m.sender?.role ? m.sender.role.toUpperCase() : 'USER';
                      const directionLabel = m.recipient
                        ? `TO: ${m.recipient.fullName.toUpperCase()}`
                        : 'TO: ALL';

                      return (
                        <Box key={m.id}>
                          <ListItem
                            alignItems="flex-start"
                            sx={{
                              py: 2.5,
                              px: 1,
                              position: 'relative',
                              '&:hover': {
                                bgcolor: 'action.hover',
                                borderRadius: 2,
                                '& .delete-action': { opacity: 1 }
                              }
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'action.selected', color: 'text.secondary', fontWeight: 600 }}>
                                {senderInitial}
                              </Avatar>
                            </ListItemAvatar>
                            
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight={700}>{m.sender?.fullName || 'System User'}</Typography>
                                    <Chip 
                                      label={senderRole} 
                                      size="small" 
                                      sx={{ 
                                        height: 18, 
                                        fontSize: '0.62rem', 
                                        fontWeight: 700, 
                                        bgcolor: 'action.disabledBackground', 
                                        color: 'text.secondary' 
                                      }} 
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      {formatDate(m.createdAt)}
                                    </Typography>
                                  </Box>
                                  
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                      label={directionLabel}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        borderColor: '#e0e7ff',
                                        color: '#4f46e5',
                                        bgcolor: '#f5f7ff',
                                        height: 22,
                                        borderRadius: 1,
                                      }}
                                    />
                                    {user?.role === 'admin' && (
                                      <IconButton
                                        size="small"
                                        color="error"
                                        className="delete-action"
                                        onClick={() => handleDelete(m.id)}
                                        sx={{ 
                                          opacity: { xs: 1, md: 0 }, 
                                          transition: 'opacity 0.2s',
                                          p: 0.25 
                                        }}
                                        title="Delete Log"
                                      >
                                        <DeleteOutlineRoundedIcon sx={{ fontSize: '1.15rem' }} />
                                      </IconButton>
                                    )}
                                  </Box>
                                </Box>
                              }
                              secondary={
                                <Typography 
                                  variant="body2" 
                                  color="text.primary" 
                                  sx={{ mt: 1, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                                >
                                  {m.content}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < messages.length - 1 && <Divider component="li" sx={{ my: 0.5 }} />}
                        </Box>
                      );
                    })}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
