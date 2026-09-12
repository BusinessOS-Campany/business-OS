import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, TablePagination, Chip, Stack, Tooltip, Avatar, CircularProgress,
} from '@mui/material';
import { Add, Delete, Edit, CloudUpload } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface Service {
  id: string;
  name: string;
  nameEn?: string | null;
  price: number;
  isActive: boolean;
  iconUrl?: string | null;
}

export default function ServicesPage() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', nameEn: '', price: '' });
  const [editing, setEditing] = useState<Service | null>(null);
  const [iconUrl, setIconUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchServices = async () => {
    try {
      const { data } = await api.get('/services');
      setServices(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchServices(); }, []);

  const paginated = services.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({ name: '', nameEn: '', price: '' });
    setIconUrl('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, nameEn: s.nameEn || '', price: s.price.toString() });
    setIconUrl(s.iconUrl || '');
    setDialogOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/services/upload', fd);
      setIconUrl(data.url);
    } catch { /* ignore */ }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, iconUrl: iconUrl || undefined };
      if (editing) {
        await api.put(`/services/${editing.id}`, payload);
      } else {
        await api.post('/services', payload);
      }
      await fetchServices();
      setDialogOpen(false);
    } catch { /* ignore */ }
  };

  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/services/${selectedId}`);
      await fetchServices();
    } catch { /* ignore */ }
    setDeleteOpen(false);
    setSelectedId(null);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('services.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          {t('services.add')}
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('services.col.icon')}</TableCell>
              <TableCell>{t('services.col.name')}</TableCell>
              <TableCell>{t('services.col.nameEn')}</TableCell>
              <TableCell>{t('services.col.price')}</TableCell>
              <TableCell>{t('services.col.status')}</TableCell>
              <TableCell>{t('services.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(s => (
              <TableRow key={s.id} sx={{ opacity: s.isActive ? 1 : 0.5 }}>
                <TableCell>
                  {s.iconUrl ? (
                    <Avatar src={s.iconUrl} sx={{ width: 40, height: 40, border: '1px solid', borderColor: 'divider' }} />
                  ) : (
                    <Avatar sx={{ width: 40, height: 40, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      <Add fontSize="small" />
                    </Avatar>
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                <TableCell>{s.nameEn || '—'}</TableCell>
                <TableCell>{s.price.toLocaleString()} YER</TableCell>
                <TableCell>
                  <Chip label={s.isActive ? t('services.active') : t('services.inactive')} size="small" color={s.isActive ? 'success' : 'default'} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleOpenEdit(s)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => openDelete(s.id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('services.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={services.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage={t('common.rowsPerPage')}
        />
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('services.edit') : t('services.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>{t('services.form.icon')}</Typography>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar src={iconUrl || undefined} sx={{ width: 56, height: 56, border: '1px solid', borderColor: 'divider' }}>
                  {iconUrl ? undefined : <CloudUpload />}
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outlined"
                  startIcon={uploading ? <CircularProgress size={18} /> : <CloudUpload />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {t('website.uploadImage')}
                </Button>
                {iconUrl && (
                  <Button size="small" color="error" onClick={() => setIconUrl('')}>
                    {t('common.delete')}
                  </Button>
                )}
              </Stack>
            </Box>
            <TextField label={t('services.form.name')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth required />
            <TextField label={t('services.form.nameEn')} value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} fullWidth />
            <TextField label={t('services.form.price')} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} fullWidth required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('patients.delete.title')}</DialogTitle>
        <DialogContent><Typography>{t('patients.delete.confirm')}</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="secondary">{t('patients.add.form.cancel')}</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">{t('patients.delete.confirmBtn')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
