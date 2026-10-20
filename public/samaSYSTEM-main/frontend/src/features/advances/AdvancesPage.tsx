import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  FormControl, InputLabel, Select, IconButton, TablePagination, Chip, Stack, Tooltip, Card,
} from '@mui/material';
import { Add, Delete, Edit, Print } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../shared/formatDate';

interface Advance {
  id: string;
  employee: string;
  specialty: string | null;
  amount: number;
  date: string;
  notes: string | null;
}

interface Employee {
  id: string;
  name: string;
  department: string | null;
  salary: number | null;
}

export default function AdvancesPage() {
  const { t } = useLanguage();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employee: '', specialty: '', amount: 0, date: '', notes: '' });
  const [editing, setEditing] = useState<Advance | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    api.get('/advances').then(({ data }) => setAdvances(data));
    api.get('/employees').then(({ data }) => setEmployees(data));
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);
  const employeeAdvances = useMemo(() => {
    if (!selectedEmployee) return [];
    let list = advances.filter(a => a.employee === selectedEmployee.name);
    if (selectedMonth) list = list.filter(a => a.date.startsWith(selectedMonth));
    return list;
  }, [advances, selectedEmployee, selectedMonth]);
  const totalAdvances = useMemo(() => employeeAdvances.reduce((s, a) => s + a.amount, 0), [employeeAdvances]);
  const remaining = selectedEmployee ? (selectedEmployee.salary ?? 0) - totalAdvances : 0;

  const handleOpenAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditing(null);
    setForm({ employee: '', specialty: '', amount: 0, date: today, notes: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (adv: Advance) => {
    setEditing(adv);
    setForm({ employee: adv.employee, specialty: adv.specialty || '', amount: adv.amount, date: adv.date, notes: adv.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/advances/${editing.id}`, form);
      } else {
        await api.post('/advances', form);
      }
      const { data } = await api.get('/advances');
      setAdvances(data);
      setDialogOpen(false);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/advances/${id}`);
      const { data } = await api.get('/advances');
      setAdvances(data);
    } catch { /* ignore */ }
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return advances;
    const q = searchQuery.toLowerCase();
    return advances.filter(a =>
      a.employee.toLowerCase().includes(q)
      || (a.specialty && a.specialty.toLowerCase().includes(q))
      || a.amount.toString().includes(q)
      || (a.notes && a.notes.toLowerCase().includes(q))
    );
  }, [advances, searchQuery]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalAmount = useMemo(() => advances.reduce((sum, a) => sum + a.amount, 0), [advances]);

  const openPrintReport = (empId: string, month?: string) => {
    const token = localStorage.getItem('accessToken');
    const lang = document.documentElement.lang || 'en';
    const base = import.meta.env.VITE_API_URL || '';
    let url = `${base ? `${base}/api` : '/api'}/advances/report/${empId}?lang=${lang}&token=${token}`;
    if (month) url += `&month=${month}`;
    window.open(url, '_blank');
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('advances.title')}</Typography>
          <Chip label={`${t('advances.total')}: ${totalAmount.toLocaleString()} YER`} color="warning" />
        </Stack>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          {t('advances.add')}
        </Button>
      </Stack>

      {/* Employee Report Section */}
      <Card sx={{ mb: 3, p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{t('advances.report.title')}</Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 280 }}>
            <InputLabel>{t('advances.report.selectEmployee')}</InputLabel>
            <Select
              value={selectedEmpId}
              label={t('advances.report.selectEmployee')}
              onChange={e => setSelectedEmpId(e.target.value)}
            >
              <MenuItem value="">{t('advances.report.selectEmployee')}</MenuItem>
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
              <Chip label={`${t('advances.report.salary')}: ${(selectedEmployee.salary ?? 0).toLocaleString()} YER`} color="primary" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.95rem', py: 2 }} />
              <Chip label={`${t('advances.report.totalAdvances')}: ${totalAdvances.toLocaleString()} YER`} color="warning" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.95rem', py: 2 }} />
              <Chip label={`${t('advances.report.remaining')}: ${remaining.toLocaleString()} YER`} color={remaining >= 0 ? 'success' : 'error'} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.95rem', py: 2 }} />
              <Button variant="contained" size="small" startIcon={<Print />} onClick={() => openPrintReport(selectedEmpId, selectedMonth)} sx={{ mr: 'auto' }}>
                {t('advances.report.print')}
              </Button>
            </Stack>

            {employeeAdvances.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t('advances.report.noAdvances')}</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table dir="rtl" size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('advances.col.amount')}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t('advances.col.date')}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t('advances.col.specialty')}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t('advances.col.notes')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeeAdvances.map(adv => (
                      <TableRow key={adv.id}>
                        <TableCell>{adv.amount.toLocaleString()} YER</TableCell>
                        <TableCell>{formatDate(adv.date)}</TableCell>
                        <TableCell>{adv.specialty || '-'}</TableCell>
                        <TableCell>{adv.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Card>

      <TextField size="small" placeholder={t('advances.search')} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} sx={{ mb: 1.5, maxWidth: 320 }} />
      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('advances.col.employee')}</TableCell>
              <TableCell>{t('advances.col.specialty')}</TableCell>
              <TableCell>{t('advances.col.amount')}</TableCell>
              <TableCell>{t('advances.col.date')}</TableCell>
              <TableCell>{t('advances.col.notes')}</TableCell>
              <TableCell>{t('advances.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(adv => (
              <TableRow key={adv.id}>
                <TableCell>{adv.employee}</TableCell>
                <TableCell>{adv.specialty || '-'}</TableCell>
                <TableCell>{adv.amount.toLocaleString()} YER</TableCell>
                <TableCell>{formatDate(adv.date)}</TableCell>
                <TableCell>{adv.notes || '-'}</TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleOpenEdit(adv)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(adv.id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('advances.empty')}</TableCell></TableRow>
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
        <DialogTitle>{editing ? t('advances.edit') : t('advances.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{t('advances.form.employee')}</InputLabel>
              <Select
                value={form.employee}
                label={t('advances.form.employee')}
                onChange={e => {
                  const emp = employees.find(emp => emp.name === e.target.value);
                  setForm(f => ({ ...f, employee: e.target.value, specialty: emp?.department || '' }));
                }}
              >
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.name}>{emp.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('advances.form.specialty')}
              value={form.specialty}
              onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
              fullWidth
            />
            <TextField
              label={t('advances.form.amount')}
              type="number"
              value={form.amount || ''}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              fullWidth
            />
            <TextField
              label={t('advances.form.date')}
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t('advances.form.notes')}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={3}
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
