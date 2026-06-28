import { Box, Typography, Card, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, Chip, Button } from '@mui/material';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import { useNotifications } from '../context/NotificationsContext';
import { useNavigate } from 'react-router-dom';

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_COLORS: Record<string, string> = {
  low_stock: 'warning',
  po_approved: 'success',
  po_sent: 'info',
  pr_approved: 'success',
  pr_rejected: 'error',
  invoice_created: 'info',
  system: 'primary',
};

const TYPE_LABELS: Record<string, string> = {
  low_stock: 'Low Stock',
  po_approved: 'PO Approved',
  po_sent: 'PO Sent',
  pr_approved: 'Requisition Approved',
  pr_rejected: 'Requisition Rejected',
  invoice_created: 'Invoice Created',
  system: 'System',
};

export default function Messages() {
  const { notifications, markRead, markAllRead, clearAll } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (m: any) => {
    if (!m.isRead) {
      markRead(m._id);
    }
    if (m.link) {
      navigate(m.link);
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
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
            <ForumRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Message Center</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Communications, approvals, and system notifications
            </Typography>
          </Box>
        </Box>
        {notifications.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CheckCircleOutlineRoundedIcon />}
              onClick={markAllRead}
              sx={{ borderRadius: 2 }}
            >
              Mark all read
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepRoundedIcon />}
              onClick={clearAll}
              sx={{ borderRadius: 2 }}
            >
              Clear all
            </Button>
          </Box>
        )}
      </Box>

      <Card>
        <List sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
              <ForumRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
              <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                No messages or notifications
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                You're all caught up! New system notifications will appear here.
              </Typography>
            </Box>
          ) : (
            notifications.map((m, index) => (
              <Box key={m._id}>
                <ListItem
                  alignItems="flex-start"
                  onClick={() => handleNotificationClick(m)}
                  sx={{
                    py: 2.5,
                    px: 3,
                    cursor: 'pointer',
                    bgcolor: m.isRead ? 'transparent' : 'action.hover',
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <ListItemAvatar sx={{ mt: 0.5 }}>
                    <Avatar sx={{ bgcolor: m.isRead ? 'text.disabled' : 'primary.main', fontWeight: 600 }}>
                      {m.title ? m.title.charAt(0).toUpperCase() : 'N'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: m.isRead ? 'text.primary' : 'primary.main' }}>
                            {m.title}
                          </Typography>
                          <Chip
                            label={TYPE_LABELS[m.type] || m.type || 'System'}
                            color={(TYPE_COLORS[m.type] as any) || 'default'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(m.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color={m.isRead ? 'text.secondary' : 'text.primary'}
                        fontWeight={m.isRead ? 400 : 500}
                        sx={{ mt: 0.5, lineHeight: 1.5 }}
                      >
                        {m.message}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </List>
      </Card>
    </Box>
  );
}
