import { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Chip,
} from '@mui/material';
import { Delete, Mail } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../shared/formatDate';

interface NewsletterItem {
  id: string;
  email: string;
  createdAt: string;
}

export default function NewsletterTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewsletterItem[]>([]);

  const fetchData = () => {
    api.get('/website/newsletter').then(({ data }) => setItems(data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (s: NewsletterItem) => {
    if (!window.confirm(t('website.newsletter.delete.confirm'))) return;
    try {
      await api.delete(`/website/newsletter/${s.id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('website.newsletter.title')}</Typography>
        <Chip icon={<Mail />} label={items.length} size="small" color="primary" />
      </Box>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('website.newsletter.email')}</TableCell>
              <TableCell>{t('website.newsletter.date')}</TableCell>
              <TableCell>{t('invoices.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(s => (
              <TableRow key={s.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{s.email}</TableCell>
                <TableCell>{formatDate(s.createdAt)}</TableCell>
                <TableCell>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(s)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3} align="center">{t('website.newsletter.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
