import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  FormControl, FormLabel, FormControlLabel, Radio, RadioGroup, InputLabel, Select,
  IconButton, TablePagination, Chip, Stack, Tooltip, Card,
} from '@mui/material';
import { Add, Delete, Edit, Print } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../shared/formatDate';

interface Coverage {
  id: string;
  name: string;
  sessionType: string;
  date: string;
  price: number;
  therapistShare: number | null;
  from: string | null;
  to: string | null;
}

interface Employee {
  id: string;
  name: string;
  department: string | null;
}

const emptyForm = { name: '', sessionType: 'normal', date: '', price: '', therapistShare: '0', from: '', to: '' };

function calcPrice(from: string, to: string): number {
  if (!from || !to) return 0;
  const [fH, fM] = from.split(':').map(Number);
  const [tH, tM] = to.split(':').map(Number);
  const diff = (tH * 60 + tM) - (fH * 60 + fM);
  if (diff <= 0) return 0;
  const hours = diff / 60;
  return Math.ceil(hours) * 500;
}

export default function CoveragesPage() {
  const { t } = useLanguage();
  const [coverages, setCoverages] = useState<Coverage[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Coverage | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);
  const employeeCoverages = useMemo(() => {
    if (!selectedEmployee) return [];
    let list = coverages.filter(c => c.name === selectedEmployee.name);
    if (selectedMonth) list = list.filter(c => c.date.startsWith(selectedMonth));
    return list;
  }, [coverages, selectedEmployee, selectedMonth]);
  const empTotalPrice = useMemo(() => employeeCoverages.reduce((s, c) => s + c.price, 0), [employeeCoverages]);
  const empTotalShare = useMemo(() => employeeCoverages.reduce((s, c) => s + (c.therapistShare ?? 0), 0), [employeeCoverages]);

  useEffect(() => {
    api.get('/coverages').then(({ data }) => setCoverages(data));
    api.get('/employees').then(({ data }) => setEmployees(data));
  }, []);

  useEffect(() => {
    setForm(f => ({ ...f, therapistShare: form.sessionType === 'hijama' ? '500' : '0' }));
    if (form.sessionType === 'normal' && (form.from || form.to)) {
      const p = calcPrice(form.from, form.to);
      setForm(f => ({ ...f, price: p.toString() }));
    }
  }, [form.sessionType, form.from, form.to]);

  const handleOpenAdd = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditing(null);
    setForm({ ...emptyForm, date: local });
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: Coverage) => {
    setEditing(c);
    const defaultShare = c.sessionType === 'hijama' ? 500 : 0;
    setForm({
      name: c.name,
      sessionType: c.sessionType || 'normal',
      date: c.date,
      price: c.price.toString(),
      therapistShare: (c.therapistShare ?? defaultShare).toString(),
      from: c.from ?? '',
      to: c.to ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        sessionType: form.sessionType,
        date: form.date,
        price: Number(form.price),
        therapistShare: Number(form.therapistShare),
        from: form.from || null,
        to: form.to || null,
      };
      if (editing) {
        const { data } = await api.put(`/coverages/${editing.id}`, payload);
        setCoverages(prev => prev.map(c => c.id === editing.id ? data.coverage : c));
      } else {
        const { data } = await api.post('/coverages', payload);
        setCoverages(prev => [data.coverage, ...prev]);
      }
      setDialogOpen(false);
    } catch { /* ignore */ }
  };

  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/coverages/${selectedId}`);
      setCoverages(prev => prev.filter(c => c.id !== selectedId));
    } catch { /* ignore */ }
    setDeleteOpen(false);
    setSelectedId(null);
  };

  const openPrintReport = (empId: string, month?: string) => {
    const token = localStorage.getItem('accessToken');
    const lang = document.documentElement.lang || 'en';
    const base = import.meta.env.VITE_API_URL || '';
    let url = `${base ? `${base}/api` : '/api'}/coverages/report/${empId}?lang=${lang}&token=${token}`;
    if (month) url += `&month=${month}`;
    window.open(url, '_blank');
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return coverages;
    const q = searchQuery.toLowerCase();
    return coverages.filter(c => c.name.toLowerCase().includes(q));
  }, [coverages, searchQuery]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalAmount = useMemo(() => coverages.reduce((s, c) => s + c.price, 0), [coverages]);

  const isNormal = form.sessionType === 'normal';

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('coverages.title')}</Typography>
          <Chip label={`${t('coverages.total')}: ${totalAmount.toLocaleString()} YER`} color="warning" />
        </Stack>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          {t('coverages.add')}
        </Button>
      </Stack>

      {/* Employee Report Section */}
      <Card sx={{ mb: 3, p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{t('coverages.report.title')}</Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 280 }}>
            <InputLabel>{t('coverages.report.selectEmployee')}</InputLabel>
            <Select
              value={selectedEmpId}
              label={t('coverages.report.selectEmployee')}
              onChange={e => setSelectedEmpId(e.target.value)}
            >
              <MenuItem value="">{t('coverages.report.selectEmployee')}</MenuItem>
              {employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="month" size="small" label={t('advances.report.selectMonth')}
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            sx={{ minWidth: 200 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {selectedMonth && (
            <Button size="small" variant="text" color="secondary" onClick={() => setSelectedMonth('')}>
              {t('common.clear')}
            </Button>
          )}
        </Stack>

        {selectedEmployee && (
          <>
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={`${t('coverages.report.totalCoverages')}: ${employeeCoverages.length}`} color="primary" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.95rem', py: 2 }} />
              <Chip label={`${t('coverages.report.totalPrice')}: ${empTotalPrice.toLocaleString()} YER`} color="warning" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.95rem', py: 2 }} />
              <Chip label={`${t('coverages.report.totalShare')}: ${empTotalShare.toLocaleString()} YER`} color="success" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.95rem', py: 2 }} />
              <Button variant="contained" size="small" startIcon={<Print />} onClick={() => openPrintReport(selectedEmpId, selectedMonth)} sx={{ mr: 'auto' }}>
                {t('advances.report.print')}
              </Button>
            </Stack>

            {employeeCoverages.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t('coverages.report.noCoverages')}</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table dir="rtl" size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('coverages.col.sessionType')}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t('coverages.col.price')}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t('coverages.col.therapistShare')}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t('coverages.col.date')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeeCoverages.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Chip
                            label={c.sessionType === 'hijama' ? t('coverages.sessionType.hijama') : t('coverages.sessionType.normal')}
                            size="small"
                            color={c.sessionType === 'hijama' ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{c.price.toLocaleString()} YER</TableCell>
                        <TableCell>{c.sessionType === 'hijama' ? `${c.therapistShare?.toLocaleString() ?? '500'} YER` : '-'}</TableCell>
                        <TableCell>{formatDate(c.date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Card>

      <TextField size="small" placeholder={t('coverages.search')} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} sx={{ mb: 1.5, maxWidth: 320 }} />
      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('coverages.col.name')}</TableCell>
              <TableCell>{t('coverages.col.sessionType')}</TableCell>
              <TableCell>{t('coverages.col.date')}</TableCell>
              <TableCell>{t('coverages.col.price')}</TableCell>
              <TableCell>{t('coverages.col.therapistShare')}</TableCell>
              <TableCell>{t('coverages.col.from')}</TableCell>
              <TableCell>{t('coverages.col.to')}</TableCell>
              <TableCell>{t('coverages.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(c => (
              <TableRow key={c.id}>
                <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                <TableCell>
                  <Chip
                    label={c.sessionType === 'hijama' ? t('coverages.sessionType.hijama') : t('coverages.sessionType.normal')}
                    size="small"
                    color={c.sessionType === 'hijama' ? 'warning' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{formatDate(c.date)}</TableCell>
                <TableCell>{c.price.toLocaleString()} YER</TableCell>
                <TableCell>{c.sessionType === 'hijama' ? `${c.therapistShare?.toLocaleString() ?? '500'} YER` : '-'}</TableCell>
                <TableCell>{c.from || '-'}</TableCell>
                <TableCell>{c.to || '-'}</TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleOpenEdit(c)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => openDelete(c.id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">{t('coverages.empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage={t('common.rowsPerPage')}
        />
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('coverages.edit') : t('coverages.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>{t('coverages.form.name')}</InputLabel>
              <Select
                value={form.name}
                label={t('coverages.form.name')}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              >
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.name}>{emp.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>{t('coverages.form.sessionType')}</FormLabel>
              <RadioGroup
                row
                value={form.sessionType}
                onChange={e => setForm(f => ({ ...f, sessionType: e.target.value }))}
              >
                <FormControlLabel value="normal" control={<Radio />} label={t('coverages.sessionType.normal')} />
                <FormControlLabel value="hijama" control={<Radio />} label={t('coverages.sessionType.hijama')} />
              </RadioGroup>
            </FormControl>

            <TextField
              label={t('coverages.form.date')}
              type="datetime-local"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {isNormal ? (
              <>
                <TextField
                  label={t('coverages.form.from')}
                  type="time"
                  value={form.from}
                  onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label={t('coverages.form.to')}
                  type="time"
                  value={form.to}
                  onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label={t('coverages.form.price')}
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  fullWidth
                  required
                />
              </>
            ) : (
              <>
                <TextField
                  label={t('coverages.form.price')}
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  fullWidth
                  required
                />
                <TextField
                  label={t('coverages.form.therapistShare')}
                  type="number"
                  value={form.therapistShare}
                  fullWidth
                  disabled
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('coverages.delete.title')}</DialogTitle>
        <DialogContent><Typography>{t('coverages.delete.confirm')}</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="secondary">{t('common.cancel')}</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">{t('coverages.delete.confirmBtn')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
