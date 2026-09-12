import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Stack, CircularProgress, Grid, Chip,
} from '@mui/material';
import { Add, Delete, Edit, CloudUpload, DragIndicator } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface GalleryImage {
  id: string;
  url: string;
  titleEn: string;
  titleAr: string | null;
  categoryEn: string | null;
  categoryAr: string | null;
  description: string | null;
  ratio: string;
  sortOrder: number;
  createdAt: string;
}

const emptyForm = {
  titleEn: '', titleAr: '', categoryEn: '', categoryAr: '', description: '',
  ratio: 'aspect-[4/3]', sortOrder: 0,
};

export default function GalleryTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    api.get('/website/gallery').then(({ data }) => setItems(data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setImageUrl('');
    setDialogOpen(true);
  };

  const handleEdit = (img: GalleryImage) => {
    setEditing(img);
    setForm({
      titleEn: img.titleEn, titleAr: img.titleAr || '', categoryEn: img.categoryEn || '',
      categoryAr: img.categoryAr || '', description: img.description || '',
      ratio: img.ratio, sortOrder: img.sortOrder,
    });
    setImageUrl(img.url);
    setDialogOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/website/upload', fd);
      setImageUrl(data.url);
    } catch { /* ignore */ }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleSave = async () => {
    if (!imageUrl || !form.titleEn) return;
    const payload = {
      url: imageUrl,
      titleEn: form.titleEn,
      titleAr: form.titleAr || undefined,
      categoryEn: form.categoryEn || undefined,
      categoryAr: form.categoryAr || undefined,
      description: form.description || undefined,
      ratio: form.ratio,
      sortOrder: form.sortOrder,
    };
    try {
      if (editing) await api.put(`/website/gallery/${editing.id}`, payload);
      else await api.post('/website/gallery', payload);
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Save failed');
    }
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!window.confirm(t('website.gallery.delete.confirm'))) return;
    try {
      await api.delete(`/website/gallery/${img.id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('website.gallery.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>{t('website.gallery.add')}</Button>
      </Stack>

      <Grid container spacing={2}>
        {items.map(img => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={img.id}>
            <Paper sx={{ overflow: 'hidden' }}>
              <Box sx={{ position: 'relative', aspectRatio: '4/3' }}>
                <Box
                  component="img"
                  src={img.url}
                  alt={img.titleAr || img.titleEn}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.85)' }} onClick={() => handleEdit(img)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" sx={{ bgcolor: 'rgba(255,255,255,0.85)' }} onClick={() => handleDelete(img)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{img.titleAr || img.titleEn}</Typography>
                {img.categoryEn && (
                  <Chip label={img.categoryAr || img.categoryEn} size="small" sx={{ mt: 0.5 }} />
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
        {items.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('website.gallery.empty')}</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('website.gallery.edit') : t('website.gallery.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>{t('website.gallery.image')}</Typography>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
              {imageUrl ? (
                <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <Box
                    component="img"
                    src={imageUrl}
                    alt="Preview"
                    sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 1, border: '1px solid #e0e0e0' }}
                  />
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 4, left: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                    onClick={() => setImageUrl('')}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={uploading ? <CircularProgress size={18} /> : <CloudUpload />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  fullWidth
                  sx={{ height: 120, borderStyle: 'dashed', fontSize: 13 }}
                >
                  {uploading ? '...' : t('website.uploadImage')}
                </Button>
              )}
            </Box>
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.gallery.titleEn')} value={form.titleEn}
                onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} fullWidth />
              <TextField label={t('website.gallery.titleAr')} value={form.titleAr}
                onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.gallery.categoryEn')} value={form.categoryEn}
                onChange={e => setForm(f => ({ ...f, categoryEn: e.target.value }))} fullWidth />
              <TextField label={t('website.gallery.categoryAr')} value={form.categoryAr}
                onChange={e => setForm(f => ({ ...f, categoryAr: e.target.value }))} fullWidth />
            </Stack>
            <TextField label={t('website.gallery.description')} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={2} />
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.gallery.ratio')} value={form.ratio}
                onChange={e => setForm(f => ({ ...f, ratio: e.target.value }))} fullWidth />
              <TextField label={t('website.gallery.sortOrder')} value={form.sortOrder} type="number"
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={!imageUrl || !form.titleEn}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
