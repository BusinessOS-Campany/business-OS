import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel,
  IconButton, Tooltip, Stack, Chip, Alert,
} from '@mui/material';
import { Add, Delete, Edit, Star } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface PackageItem {
  id: string;
  name: string;
  priceUsd: number;
  priceYer: number;
  features: string[];
  popular: boolean;
}

export default function PackagesTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<PackageItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PackageItem | null>(null);
  const [form, setForm] = useState({ name: '', priceUsd: '', priceYer: '', popular: false });
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [error, setError] = useState('');

  const fetchData = () => {
    api.get('/website/packages').then(({ data }) => setItems(data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => {
    setEditing(null);
    setError('');
    setForm({ name: '', priceUsd: '', priceYer: '', popular: false });
    setFeatures([]);
    setDialogOpen(true);
  };

  const handleEdit = (p: PackageItem) => {
    setEditing(p);
    setError('');
    setForm({ name: p.name, priceUsd: String(p.priceUsd), priceYer: String(p.priceYer), popular: p.popular });
    setFeatures([...p.features]);
    setDialogOpen(true);
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !features.includes(f)) setFeatures(prev => [...prev, f]);
    setFeatureInput('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError(t('website.packages.name')); return; }
    const payload = {
      name: form.name.trim(),
      priceUsd: parseFloat(form.priceUsd) || 0,
      priceYer: parseFloat(form.priceYer) || 0,
      popular: form.popular,
      features,
    };
    try {
      if (editing) await api.put(`/website/packages/${editing.id}`, payload);
      else await api.post('/website/packages', payload);
      setDialogOpen(false);
      fetchData();
    } catch { setError(t('common.error')); }
  };

  const handleDelete = async (p: PackageItem) => {
    if (!window.confirm(t('website.packages.delete.confirm'))) return;
    try {
      await api.delete(`/website/packages/${p.id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('website.packages.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>{t('website.packages.add')}</Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('website.packages.name')}</TableCell>
              <TableCell>{t('website.packages.priceUsd')}</TableCell>
              <TableCell>{t('website.packages.priceYer')}</TableCell>
              <TableCell>{t('website.packages.featuresCount')}</TableCell>
              <TableCell>{t('website.packages.popular')}</TableCell>
              <TableCell>{t('invoices.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(p => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                <TableCell>${p.priceUsd.toLocaleString()}</TableCell>
                <TableCell>{p.priceYer.toLocaleString()} YER</TableCell>
                <TableCell>
                  <Tooltip title={p.features.join(' • ')}>
                    <Chip label={p.features.length} size="small" />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {p.popular && <Chip icon={<Star />} label={t('website.packages.popular')} size="small" color="warning" />}
                </TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleEdit(p)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(p)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('website.packages.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('website.packages.edit') : t('website.packages.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
            <TextField label={t('website.packages.name')} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.packages.priceUsd')} type="number" value={form.priceUsd}
                onChange={e => setForm(f => ({ ...f, priceUsd: e.target.value }))} fullWidth />
              <TextField label={t('website.packages.priceYer')} type="number" value={form.priceYer}
                onChange={e => setForm(f => ({ ...f, priceYer: e.target.value }))} fullWidth />
            </Stack>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>{t('website.packages.features')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {features.map(f => (
                  <Chip key={f} label={f} size="small" onDelete={() => setFeatures(prev => prev.filter(x => x !== f))} />
                ))}
              </Box>
              <TextField size="small" placeholder={t('website.packages.features.placeholder')}
                value={featureInput}
                onChange={e => setFeatureInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                fullWidth />
            </Box>
            <FormControlLabel
              control={<Switch checked={form.popular} onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))} />}
              label={t('website.packages.popular')}
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
