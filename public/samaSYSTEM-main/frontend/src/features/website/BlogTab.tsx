import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip,
  Stack, Chip, CircularProgress,
} from '@mui/material';
import { Add, Delete, Edit, Visibility, VisibilityOff, CloudUpload } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface BlogItem {
  id: string;
  titleEn: string;
  titleAr: string | null;
  excerptEn: string | null;
  excerptAr: string | null;
  contentEn: string | null;
  contentAr: string | null;
  coverUrl: string | null;
  category: string | null;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
}

const emptyForm = {
  titleEn: '', titleAr: '', excerptEn: '', excerptAr: '', contentEn: '', contentAr: '',
  coverUrl: '', category: '', isPublished: false,
};

export default function BlogTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<BlogItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BlogItem | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    api.get('/website/blog').then(({ data }) => setItems(data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setTags([]);
    setDialogOpen(true);
  };

  const handleEdit = (p: BlogItem) => {
    setEditing(p);
    setForm({
      titleEn: p.titleEn, titleAr: p.titleAr || '', excerptEn: p.excerptEn || '', excerptAr: p.excerptAr || '',
      contentEn: p.contentEn || '', contentAr: p.contentAr || '', coverUrl: p.coverUrl || '',
      category: p.category || '', isPublished: p.isPublished,
    });
    setTags([...p.tags]);
    setDialogOpen(true);
  };

  const addTag = () => {
    const tg = tagInput.trim();
    if (tg && !tags.includes(tg)) setTags(prev => [...prev, tg]);
    setTagInput('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/website/upload', fd);
      setForm(f => ({ ...f, coverUrl: data.url }));
    } catch { /* ignore */ }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleSave = async () => {
    const payload = {
      titleEn: form.titleEn, titleAr: form.titleAr || undefined, excerptEn: form.excerptEn || undefined,
      excerptAr: form.excerptAr || undefined, contentEn: form.contentEn || undefined,
      contentAr: form.contentAr || undefined, coverUrl: form.coverUrl || undefined,
      category: form.category || undefined, isPublished: form.isPublished, tags,
    };
    try {
      if (editing) await api.put(`/website/blog/${editing.id}`, payload);
      else await api.post('/website/blog', payload);
      setDialogOpen(false);
      fetchData();
    } catch { /* ignore */ }
  };

  const togglePublish = async (p: BlogItem) => {
    try {
      await api.put(`/website/blog/${p.id}`, { isPublished: !p.isPublished });
      fetchData();
    } catch { /* ignore */ }
  };

  const handleDelete = async (p: BlogItem) => {
    if (!window.confirm(t('website.blog.delete.confirm'))) return;
    try {
      await api.delete(`/website/blog/${p.id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('website.blog.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>{t('website.blog.add')}</Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('website.blog.titleEn')}</TableCell>
              <TableCell>{t('website.blog.category')}</TableCell>
              <TableCell>{t('website.blog.tags')}</TableCell>
              <TableCell>{t('website.blog.published')}</TableCell>
              <TableCell>{t('invoices.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(p => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{p.titleAr || p.titleEn}</TableCell>
                <TableCell>{p.category || '-'}</TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, overflow: 'hidden' }}>
                    {p.tags.slice(0, 3).map(tg => <Chip key={tg} label={tg} size="small" variant="outlined" />)}
                    {p.tags.length > 3 && <Chip label={`+${p.tags.length - 3}`} size="small" />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={p.isPublished ? <Visibility /> : <VisibilityOff />}
                    label={p.isPublished ? t('website.blog.published') : '-'}
                    size="small"
                    color={p.isPublished ? 'success' : 'default'}
                    onClick={() => togglePublish(p)}
                  />
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
              <TableRow><TableCell colSpan={5} align="center">{t('website.blog.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? t('website.blog.edit') : t('website.blog.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.blog.titleEn')} value={form.titleEn}
                onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} fullWidth />
              <TextField label={t('website.blog.titleAr')} value={form.titleAr}
                onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.blog.excerptEn')} value={form.excerptEn}
                onChange={e => setForm(f => ({ ...f, excerptEn: e.target.value }))} fullWidth />
              <TextField label={t('website.blog.excerptAr')} value={form.excerptAr}
                onChange={e => setForm(f => ({ ...f, excerptAr: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.blog.contentEn')} value={form.contentEn}
                onChange={e => setForm(f => ({ ...f, contentEn: e.target.value }))} fullWidth multiline rows={4} />
              <TextField label={t('website.blog.contentAr')} value={form.contentAr}
                onChange={e => setForm(f => ({ ...f, contentAr: e.target.value }))} fullWidth multiline rows={4} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>{t('website.blog.coverUrl')}</Typography>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
                {form.coverUrl ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box
                      component="img"
                      src={form.coverUrl}
                      alt="Cover"
                      sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1, border: '1px solid #e0e0e0' }}
                    />
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: 4, left: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                      onClick={() => setForm(f => ({ ...f, coverUrl: '' }))}
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
              <TextField label={t('website.blog.category')} value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))} fullWidth />
            </Stack>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>{t('website.blog.tags')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {tags.map(tg => (
                  <Chip key={tg} label={tg} size="small" onDelete={() => setTags(prev => prev.filter(x => x !== tg))} />
                ))}
              </Box>
              <TextField size="small" placeholder={t('website.blog.tags.placeholder')}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                fullWidth />
            </Box>
            <Chip
              label={t('website.blog.published')}
              color={form.isPublished ? 'success' : 'default'}
              onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))}
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
