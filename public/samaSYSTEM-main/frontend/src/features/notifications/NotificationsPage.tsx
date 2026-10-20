import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, List, ListItem, ListItemIcon,
  ListItemText, Chip, IconButton, Button, CircularProgress, Divider,
} from '@mui/material';
import { Mail, Warning, CheckCircle, DeleteSweep } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

interface NotifItem {
  id: string;
  type: string;
  data: string | null;
  createdAt: string;
  readAt: string | null;
}

const parseData = (raw: string | null) => {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
};

const formatRelativeTime = (dateStr: string, t: (key: string, params?: Record<string, string | number>) => string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notification.time.now');
  if (mins < 60) return t('notification.time.min', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notification.time.hour', { count: hours });
  const days = Math.floor(hours / 24);
  return t('notification.time.day', { count: days });
};

export default function NotificationsPage() {
  const { t, locale } = useLanguage();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'alerts'>('all');

  const fetchNotifs = useCallback(() => {
    setLoading(true);
    api.get('/notifications').then(({ data }) => {
      setNotifications(data.notifications);
      setUnread(data.unread);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnread(0);
  };

  const filtered = tab === 'alerts'
    ? notifications.filter(n => n.type.includes('expense'))
    : notifications;

  const getIcon = (type: string) => {
    if (type.includes('expense')) return <Warning fontSize="small" />;
    return <Mail fontSize="small" />;
  };

  const getColor = (type: string) => {
    if (type.includes('expense')) return 'warning.main';
    return 'primary.main';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('nav.notifications')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {unread > 0 ? `${unread} ${t('notification.unread')}` : t('notification.allRead')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {(['all', 'alerts'] as const).map(tabKey => (
            <Chip key={tabKey} label={t('notification.' + tabKey)}
              variant={tab === tabKey ? 'filled' : 'outlined'}
              onClick={() => setTab(tabKey)}
              color={tab === tabKey ? 'primary' : 'default'}
            />
          ))}
          {unread > 0 && (
            <Button size="small" startIcon={<CheckCircle />} onClick={markAllRead} sx={{ textTransform: 'none' }}>
              {t('notification.markAllRead')}
            </Button>
          )}
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <DeleteSweep sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">{t('notification.empty')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('notification.24hNote')}</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filtered.map((n, i) => (
                <ListItem
                  key={n.id}
                  divider={i < filtered.length - 1}
                  sx={{
                    px: 3, py: 2,
                    bgcolor: n.readAt ? undefined : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    transition: 'bgcolor 0.2s',
                  }}
                  secondaryAction={
                    !n.readAt ? (
                      <IconButton edge="end" size="small" onClick={() => markRead(n.id)} title={t('notification.markRead')}>
                        <CheckCircle fontSize="small" color="primary" />
                      </IconButton>
                    ) : undefined
                  }
                >
                  <ListItemIcon sx={{ minWidth: 40, color: getColor(n.type) }}>
                    {getIcon(n.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: n.readAt ? 400 : 600 }}>
                          {t(n.type, parseData(n.data))}
                        </Typography>
                        {!n.readAt && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(n.createdAt, t)}
                        </Typography>
                        {n.readAt && (
                          <Chip label={t('notification.read')} size="small" variant="outlined"
                            sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: 0.8 } }} />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {t('notification.24hNote')}
        </Typography>
      </Box>
    </Box>
  );
}
