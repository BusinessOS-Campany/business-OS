import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip,
  Stack, Chip, Rating,
} from '@mui/material';
import { Add, Delete, Edit, Star } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface TestimonialItem {
  id: string;
  patientName: string;
  rating: number;
  textEn: string;
  textAr: string | null;
  treatment: string | null;
  photoUrl: string | null;
  isFeatured: boolean;
  createdAt: string;
}

export default function TestimonialsTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TestimonialItem | null>(null);
  const [form, setForm] = useState({ patientName: '', rating: 5, textEn: '', textAr: '', treatment: '', photoUrl: '', isFeatured: false });

  const fetchData = () => {
    api.get('/website/testimonials').then(({ data }) => setItems(data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => {
    setEditing(null);
    setForm({ patientName: '', rating: 5, textEn: '', textAr: '', treatment: '', photoUrl: '', isFeatured: false });
    setDialogOpen(true);
  };

  const handleEdit = (x: TestimonialItem) => {
    setEditing(x);
    setForm({ patientName: x.patientName, rating: x.rating, textEn: x.textEn, textAr: x.textAr || '', treatment: x.treatment || '', photoUrl: x.photoUrl || '', isFeatured: x.isFeatured });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await api.put(`/website/testimonials/${editing.id}`, form);
      else await api.post('/website/testimonials', form);
      setDialogOpen(false);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleDelete = async (x: TestimonialItem) => {
    if (!window.confirm(t('website.testimonials.delete.confirm'))) return;
    try {
      await api.delete(`/website/testimonials/${x.id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('website.testimonials.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>{t('website.testimonials.add')}</Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('website.testimonials.patientName')}</TableCell>
              <TableCell>{t('website.testimonials.rating')}</TableCell>
              <TableCell>{t('website.testimonials.textEn')}</TableCell>
              <TableCell>{t('website.testimonials.treatment')}</TableCell>
              <TableCell>{t('website.testimonials.featured')}</TableCell>
              <TableCell>{t('invoices.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(x => (
              <TableRow key={x.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{x.patientName}</TableCell>
                <TableCell><Rating value={x.rating} readOnly size="small" /></TableCell>
                <TableCell sx={{ maxWidth: 260 }}>
                  <Typography variant="body2" noWrap>{x.textEn}</Typography>
                </TableCell>
                <TableCell>{x.treatment || '-'}</TableCell>
                <TableCell>{x.isFeatured && <Chip icon={<Star />} label={t('website.testimonials.featured')} size="small" color="warning" />}</TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleEdit(x)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(x)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('website.testimonials.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('website.testimonials.edit') : t('website.testimonials.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={t('website.testimonials.patientName')} value={form.patientName}
              onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} fullWidth />
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5 }}>{t('website.testimonials.rating')}</Typography>
              <Rating value={form.rating} onChange={(_, v) => setForm(f => ({ ...f, rating: v || 5 }))} />
            </Box>
            <TextField label={t('website.testimonials.textEn')} value={form.textEn}
              onChange={e => setForm(f => ({ ...f, textEn: e.target.value }))} fullWidth multiline rows={2} />
            <TextField label={t('website.testimonials.textAr')} value={form.textAr}
              onChange={e => setForm(f => ({ ...f, textAr: e.target.value }))} fullWidth multiline rows={2} />
            <TextField label={t('website.testimonials.treatment')} value={form.treatment}
              onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))} fullWidth />
            <TextField label={t('website.testimonials.photoUrl')} value={form.photoUrl}
              onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))} fullWidth />
            <Chip
              label={t('website.testimonials.featured')}
              color={form.isFeatured ? 'warning' : 'default'}
              onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}
              sx={{ alignSelf: 'flex-start' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
