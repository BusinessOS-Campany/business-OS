import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip,
  Stack, Chip, Rating, CircularProgress, Avatar,
} from '@mui/material';
import { Add, Delete, Edit, CloudUpload } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface DoctorItem {
  id: string;
  name: string;
  nameAr: string | null;
  specialty: string;
  specialtyAr: string | null;
  bio: string | null;
  photoUrl: string | null;
  experienceYears: number;
  rating: number;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm = { name: '', nameAr: '', specialty: '', specialtyAr: '', bio: '', photoUrl: '', experienceYears: '0', rating: 5, isActive: true, sortOrder: '0' };

export default function DoctorsTab() {
  const { t } = useLanguage();
  const [items, setItems] = useState<DoctorItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorItem | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    api.get('/website/doctors').then(({ data }) => setItems(data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const handleEdit = (d: DoctorItem) => {
    setEditing(d);
    setForm({
      name: d.name, nameAr: d.nameAr || '', specialty: d.specialty, specialtyAr: d.specialtyAr || '',
      bio: d.bio || '', photoUrl: d.photoUrl || '', experienceYears: String(d.experienceYears),
      rating: d.rating, isActive: d.isActive, sortOrder: String(d.sortOrder),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name, nameAr: form.nameAr || undefined, specialty: form.specialty,
      specialtyAr: form.specialtyAr || undefined, bio: form.bio || undefined, photoUrl: form.photoUrl || undefined,
      experienceYears: parseInt(form.experienceYears) || 0, rating: form.rating,
      isActive: form.isActive, sortOrder: parseInt(form.sortOrder) || 0,
    };
    try {
      if (editing) await api.put(`/website/doctors/${editing.id}`, payload);
      else await api.post('/website/doctors', payload);
      setDialogOpen(false);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/website/upload', fd);
      setForm(f => ({ ...f, photoUrl: data.url }));
    } catch { /* ignore */ }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleDelete = async (d: DoctorItem) => {
    if (!window.confirm(t('website.doctors.delete.confirm'))) return;
    try {
      await api.delete(`/website/doctors/${d.id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('website.doctors.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>{t('website.doctors.add')}</Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('website.doctors.name')}</TableCell>
              <TableCell>{t('website.doctors.specialty')}</TableCell>
              <TableCell>{t('website.doctors.experienceYears')}</TableCell>
              <TableCell>{t('website.doctors.rating')}</TableCell>
              <TableCell>{t('website.doctors.active')}</TableCell>
              <TableCell>{t('invoices.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(d => (
              <TableRow key={d.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{d.nameAr || d.name}</TableCell>
                <TableCell>{d.specialtyAr || d.specialty}</TableCell>
                <TableCell>{d.experienceYears}</TableCell>
                <TableCell><Rating value={d.rating} readOnly size="small" /></TableCell>
                <TableCell>
                  <Chip label={d.isActive ? t('website.doctors.active') : '-'} size="small" color={d.isActive ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleEdit(d)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(d)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('website.doctors.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('website.doctors.edit') : t('website.doctors.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.doctors.name')} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
              <TextField label={t('website.doctors.nameAr')} value={form.nameAr}
                onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.doctors.specialty')} value={form.specialty}
                onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} fullWidth />
              <TextField label={t('website.doctors.specialtyAr')} value={form.specialtyAr}
                onChange={e => setForm(f => ({ ...f, specialtyAr: e.target.value }))} fullWidth />
            </Stack>
            <TextField label={t('website.doctors.bio')} value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} fullWidth multiline rows={3} />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>{t('website.doctors.photoUrl')}</Typography>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar src={form.photoUrl || undefined} sx={{ width: 64, height: 64, border: '1px solid', borderColor: 'divider' }}>
                  {form.photoUrl ? undefined : <CloudUpload />}
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
                {form.photoUrl && (
                  <Button size="small" color="error" onClick={() => setForm(f => ({ ...f, photoUrl: '' }))}>
                    {t('common.delete')}
                  </Button>
                )}
              </Stack>
            </Box>
            <TextField label={t('website.doctors.photoUrl')} value={form.photoUrl}
              onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label={t('website.doctors.experienceYears')} type="number" value={form.experienceYears}
                onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value }))} fullWidth />
              <TextField label={t('website.doctors.sortOrder')} type="number" value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} fullWidth />
            </Stack>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5 }}>{t('website.doctors.rating')}</Typography>
              <Rating value={form.rating} onChange={(_, v) => setForm(f => ({ ...f, rating: v || 0 }))} />
            </Box>
            <Chip
              label={t('website.doctors.active')}
              color={form.isActive ? 'success' : 'default'}
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
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
