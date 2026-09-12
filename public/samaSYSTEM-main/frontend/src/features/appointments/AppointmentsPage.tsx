import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, IconButton, Collapse,
  Table, TableHead, TableBody, TableRow, TableCell, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Chip, Pagination,
} from '@mui/material';
import { KeyboardArrowUp, Close, Edit, Delete } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

interface Appointment {
  id: string;
  patient: string;
  phone: string | null;
  therapist: string | null;
  date: string | null;
  status: string | null;
  notes: string | null;
}

interface Specialist {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ['completed', 'pending', 'not_completed'];

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = ('0' + d.getDate()).slice(-2);
  const month = ('0' + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function AppointmentsPage() {
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const [form, setForm] = useState({
    patient: '', phone: '', therapist: '', date: '', notes: '',
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchAppointments = useCallback(async () => {
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch { /* ignore */ }
  }, []);

  const fetchSpecialists = useCallback(async () => {
    try {
      const { data } = await api.get('/employees?department=علاج طبيعي');
      setSpecialists(data);
    } catch (err) { console.error('Fetch specialists error:', err); }
  }, []);

  useEffect(() => { fetchAppointments(); fetchSpecialists(); }, [fetchAppointments, fetchSpecialists]);

  const filtered = appointments.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.patient.toLowerCase().includes(q)
      || (a.therapist && a.therapist.toLowerCase().includes(q))
      || (a.phone && a.phone.includes(q));
  });
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  useEffect(() => { setPage(0); }, [searchQuery, statusFilter]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/appointments', form);
      showMessage('success', data.message);
      setForm({ patient: '', phone: '', therapist: '', date: '', notes: '' });
      fetchAppointments();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Error');
    }
  };

  const openEdit = async (id: string) => {
    try {
      const { data } = await api.get<Appointment>(`/appointments/${id}`);
      setSelectedId(id);
      setForm({
        patient: data.patient,
        phone: data.phone || '',
        therapist: data.therapist || '',
        date: data.date || '',
        notes: data.notes || '',
      });
      setEditOpen(true);
    } catch { /* ignore */ }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      const { data } = await api.put(`/appointments/${selectedId}`, form);
      showMessage('success', data.message);
      setEditOpen(false);
      fetchAppointments();
    } catch (err: any) {
      showMessage('error', err.response?.data?.message || 'Error');
    }
  };

  const openDelete = (id: string) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      const { data } = await api.delete(`/appointments/${selectedId}`);
      showMessage('success', data.message);
      fetchAppointments();
    } catch (err: any) {
      showMessage('error', err.response?.data?.message || 'Error');
    }
    setDeleteOpen(false);
    setSelectedId(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { data } = await api.put(`/appointments/${id}/status`, { status });
      showMessage('success', data.message);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch {
      showMessage('error', 'Error updating status');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('appointments.title')}</Typography>
      </Box>

      {/* Add Form */}
      <Card sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('appointments.add')}</Typography>
          <IconButton size="small" onClick={() => setOpen(o => !o)} sx={{ color: 'text.secondary' }}>
            <KeyboardArrowUp sx={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.3s' }} />
          </IconButton>
        </Box>
        <Collapse in={open}>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} sx={{ '& .MuiTextField-root': { mb: 2.5 } }}>
              <TextField fullWidth label={t('patients.add.form.name')} value={form.patient} onChange={handleChange('patient')} required />
              <TextField fullWidth label={t('patients.add.form.phone')} value={form.phone} onChange={handleChange('phone')} />
              <TextField fullWidth label={t('appointments.col.date')} type="date" value={form.date} onChange={handleChange('date')} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField fullWidth select label={t('appointments.col.therapist')} value={form.therapist} onChange={handleChange('therapist')}>
                <MenuItem value="">{t('appointments.status.pending')}</MenuItem>
                {specialists.map(s => <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>)}
              </TextField>
              <TextField fullWidth label={t('patients.add.form.notes')} multiline rows={2} value={form.notes} onChange={handleChange('notes')} />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
                <Button variant="outlined" color="warning" onClick={() => setForm({ patient: '', phone: '', therapist: '', date: '', notes: '' })}>{t('patients.add.form.cancel')}</Button>
                <Button variant="contained" color="success" type="submit">{t('patients.add.form.save')}</Button>
              </Box>
            </Box>
          </CardContent>
        </Collapse>
      </Card>

      {/* Message */}
      <Collapse in={!!message} sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: message?.type === 'success' ? '#2e7d3215' : '#d32f2f15', color: message?.type === 'success' ? '#2e7d32' : '#d32f2f', border: '1px solid', borderColor: message?.type === 'success' ? '#2e7d32' : '#d32f2f' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{message?.text}</Typography>
          <IconButton size="small" onClick={() => setMessage(null)} sx={{ color: 'inherit' }}><Close sx={{ fontSize: 18 }} /></IconButton>
        </Box>
      </Collapse>

      {/* List */}
      <Card>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('appointments.title')}</Typography>
        </Box>
        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" placeholder={t('appointments.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ maxWidth: 320 }} />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[{ label: t('sessions.all'), value: '' }, ...STATUS_OPTIONS.map(s => ({ label: t(`appointments.status.${s}`), value: s }))].map(opt => (
              <Button key={opt.value} size="small" variant={statusFilter === opt.value ? 'contained' : 'outlined'} color="primary" onClick={() => setStatusFilter(opt.value)} sx={{ minWidth: 50, fontSize: '0.7rem' }}>
                {opt.label}
              </Button>
            ))}
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'action.hover' } }}>
                <TableCell>{t('patients.add.form.name')}</TableCell>
                <TableCell>{t('patients.add.form.phone')}</TableCell>
                <TableCell>{t('appointments.col.date')}</TableCell>
                <TableCell>{t('appointments.col.therapist')}</TableCell>
                <TableCell>{t('patients.add.form.notes')}</TableCell>
                <TableCell>{t('appointments.col.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map(a => (
                <TableRow key={a.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{a.patient}</TableCell>
                  <TableCell>{a.phone || '-'}</TableCell>
                  <TableCell>{formatDate(a.date)}</TableCell>
                  <TableCell>{a.therapist || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes || '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <IconButton size="small" onClick={() => openEdit(a.id)} sx={{ bgcolor: '#007bff15', color: '#007bff', '&:hover': { bgcolor: '#007bff25' } }}><Edit sx={{ fontSize: 18 }} /></IconButton>
                      <IconButton size="small" onClick={() => openDelete(a.id)} sx={{ bgcolor: '#dc354515', color: '#dc3545', '&:hover': { bgcolor: '#dc354525' } }}><Delete sx={{ fontSize: 18 }} /></IconButton>
                      <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange(a.id, 'completed')} sx={{ fontSize: '0.65rem', minWidth: 0, px: 1 }}>{t('appointments.status.completed')}</Button>
                      <Button size="small" variant="contained" color="warning" onClick={() => handleStatusChange(a.id, 'pending')} sx={{ fontSize: '0.65rem', minWidth: 0, px: 1 }}>{t('appointments.status.pending')}</Button>
                      <Button size="small" variant="contained" color="inherit" onClick={() => handleStatusChange(a.id, 'not_completed')} sx={{ fontSize: '0.65rem', minWidth: 0, px: 1 }}>{t('appointments.status.not_completed')}</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>{t('appointments.empty')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination count={totalPages} page={page + 1} onChange={(_, v) => setPage(v - 1)} color="primary" size="small" />
          </Box>
        )}
      </Card>

      {/* Edit Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('appointments.edit')}</DialogTitle>
          <DialogContent>
            <TextField fullWidth label={t('patients.add.form.name')} value={form.patient} onChange={handleChange('patient')} sx={{ mb: 2 }} required />
            <TextField fullWidth label={t('patients.add.form.phone')} value={form.phone} onChange={handleChange('phone')} sx={{ mb: 2 }} />
            <TextField fullWidth label={t('appointments.col.date')} type="date" value={form.date} onChange={handleChange('date')} sx={{ mb: 2 }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField fullWidth select label={t('appointments.col.therapist')} value={form.therapist} onChange={handleChange('therapist')} sx={{ mb: 2 }}>
              <MenuItem value="">{t('appointments.status.pending')}</MenuItem>
              {specialists.map(s => <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth label={t('patients.add.form.notes')} multiline rows={2} value={form.notes} onChange={handleChange('notes')} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(false)} color="secondary">{t('patients.add.form.cancel')}</Button>
            <Button type="submit" variant="contained" color="primary">{t('appointments.save')}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('appointments.delete.title')}</DialogTitle>
        <DialogContent><Typography>{t('appointments.delete.confirm')}</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="secondary">{t('patients.add.form.cancel')}</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">{t('appointments.delete.confirmBtn')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
