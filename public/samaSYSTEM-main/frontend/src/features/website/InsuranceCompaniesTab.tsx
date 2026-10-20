import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel,
  IconButton, Tooltip, Stack, Chip, Alert, Avatar, CircularProgress,
} from '@mui/material';
import { Add, Delete, Edit, CloudUpload } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface InsuranceCompanyItem {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export default function InsuranceCompaniesTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<InsuranceCompanyItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceCompanyItem | null>(null);
  const [form, setForm] = useState({ name: '', logoUrl: '', description: '', sortOrder: '0', active: true });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    api.get('/website/insurance-companies').then(({ data }) => setItems(data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/website/upload', fd);
      setForm(f => ({ ...f, logoUrl: data.url }));
    } catch { /* ignore */ }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleAdd = () => {
    setEditing(null);
    setError('');
    setForm({ name: '', logoUrl: '', description: '', sortOrder: '0', active: true });
    setDialogOpen(true);
  };

  const handleEdit = (c: InsuranceCompanyItem) => {
    setEditing(c);
    setError('');
    setForm({
      name: c.name,
      logoUrl: c.logoUrl || '',
      description: c.description || '',
      sortOrder: String(c.sortOrder),
      active: c.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError(t('website.insuranceCompanies.name')); return; }
    const payload = {
      name: form.name.trim(),
      logoUrl: form.logoUrl.trim() || null,
      description: form.description.trim() || null,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      active: form.active,
    };
    try {
      if (editing) await api.put(`/website/insurance-companies/${editing.id}`, payload);
      else await api.post('/website/insurance-companies', payload);
      setDialogOpen(false);
      fetchData();
    } catch { setError(t('common.error')); }
  };

  const handleDelete = async (c: InsuranceCompanyItem) => {
    if (!window.confirm(t('website.insuranceCompanies.delete.confirm'))) return;
    try {
      await api.delete(`/website/insurance-companies/${c.id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('website.insuranceCompanies.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>{t('website.insuranceCompanies.add')}</Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('website.insuranceCompanies.logo')}</TableCell>
              <TableCell>{t('website.insuranceCompanies.name')}</TableCell>
              <TableCell>{t('website.insuranceCompanies.description')}</TableCell>
              <TableCell>{t('website.insuranceCompanies.sortOrder')}</TableCell>
              <TableCell>{t('website.insuranceCompanies.active')}</TableCell>
              <TableCell>{t('invoices.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(c => (
              <TableRow key={c.id} hover>
                <TableCell>
                  {c.logoUrl ? (
                    <Box component="img" src={c.logoUrl} alt={c.name} sx={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 1, border: '1px solid #e2e8f0', bgcolor: '#fff' }} />
                  ) : (
                    <Box sx={{ width: 44, height: 44, borderRadius: 1, border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 20 }}>—</Box>
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                <TableCell sx={{ maxWidth: 260 }}>{c.description || '—'}</TableCell>
                <TableCell>{c.sortOrder}</TableCell>
                <TableCell>
                  {c.active
                    ? <Chip label={t('website.insuranceCompanies.enabled')} size="small" color="success" />
                    : <Chip label={t('website.insuranceCompanies.disabled')} size="small" color="default" />}
                </TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleEdit(c)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(c)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('website.insuranceCompanies.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('website.insuranceCompanies.edit') : t('website.insuranceCompanies.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
            <TextField label={t('website.insuranceCompanies.name')} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>{t('website.insuranceCompanies.logoUrl')}</Typography>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar src={form.logoUrl || undefined} variant="rounded" sx={{ width: 64, height: 64, border: '1px solid', borderColor: 'divider' }}>
                  {form.logoUrl ? undefined : <CloudUpload />}
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
                {form.logoUrl && (
                  <Button size="small" color="error" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))}>
                    {t('common.delete')}
                  </Button>
                )}
              </Stack>
              <TextField label={t('website.insuranceCompanies.logoUrl')} value={form.logoUrl}
                onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} fullWidth sx={{ mt: 1 }} />
            </Box>
            <TextField label={t('website.insuranceCompanies.description')} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={3} />
            <TextField label={t('website.insuranceCompanies.sortOrder')} type="number" value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} fullWidth />
            <FormControlLabel
              control={<Switch checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />}
              label={t('website.insuranceCompanies.active')}
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
