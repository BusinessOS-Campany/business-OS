import { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField,
} from '@mui/material';
import { Delete, Done, Undo, Mail, Reply, Edit } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../shared/formatDate';

interface ContactItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isResolved: boolean;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export default function ContactMessagesTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ContactItem[]>([]);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ContactItem | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchData = () => {
    api.get('/website/contact-messages').then(({ data }) => setItems(data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const toggleResolved = async (m: ContactItem) => {
    try {
      await api.put(`/website/contact-messages/${m.id}`, { isResolved: !m.isResolved });
      fetchData();
    } catch { /* ignore */ }
  };

  const handleDelete = async (m: ContactItem) => {
    if (!window.confirm(t('website.contact.delete.confirm'))) return;
    try {
      await api.delete(`/website/contact-messages/${m.id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  const openReply = (m: ContactItem) => {
    setReplyTarget(m);
    setReplyText(m.reply || '');
    setReplyOpen(true);
  };

  const saveReply = async () => {
    if (!replyTarget) return;
    try {
      await api.put(`/website/contact-messages/${replyTarget.id}`, { reply: replyText });
      setReplyOpen(false);
      setReplyTarget(null);
      fetchData();
    } catch { /* ignore */ }
  };

  const unresolved = items.filter(m => !m.isResolved).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('website.contact.title')}</Typography>
        <Chip icon={<Mail />} label={unresolved} size="small" color={unresolved > 0 ? 'error' : 'success'} />
      </Box>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('website.contact.name')}</TableCell>
              <TableCell>{t('website.contact.phone')}</TableCell>
              <TableCell>{t('website.contact.subject')}</TableCell>
              <TableCell>{t('website.contact.message')}</TableCell>
              <TableCell>{t('website.contact.reply')}</TableCell>
              <TableCell>{t('website.contact.resolved')}</TableCell>
              <TableCell>{t('invoices.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(m => (
              <TableRow key={m.id} hover sx={m.isResolved ? { opacity: 0.6 } : undefined}>
                <TableCell sx={{ fontWeight: 600 }}>{m.name}</TableCell>
                <TableCell>{m.phone || '-'}</TableCell>
                <TableCell>{m.subject || '-'}</TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body2" noWrap>{m.message}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body2" noWrap color={m.reply ? 'success.main' : 'text.secondary'}>
                    {m.reply || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={m.isResolved ? t('website.contact.resolved') : '-'}
                    size="small"
                    color={m.isResolved ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={t('website.contact.replyBtn')}>
                    <IconButton size="small" color="primary" onClick={() => openReply(m)}>
                      {m.reply ? <Edit fontSize="small" /> : <Reply fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={m.isResolved ? t('website.contact.unresolve') : t('website.contact.markResolved')}>
                    <IconButton size="small" color={m.isResolved ? 'warning' : 'success'} onClick={() => toggleResolved(m)}>
                      {m.isResolved ? <Undo fontSize="small" /> : <Done fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(m)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">{t('website.contact.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={replyOpen} onClose={() => setReplyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('website.contact.replyBtn')}</DialogTitle>
        <DialogContent>
          {replyTarget && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{replyTarget.name}</Typography>
              <Typography variant="body2" color="text.secondary">{replyTarget.message}</Typography>
            </Box>
          )}
          <TextField
            label={t('website.contact.reply')}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            fullWidth
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveReply}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {items.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {formatDate(items[0].createdAt)}
        </Typography>
      )}
    </Box>
  );
}
