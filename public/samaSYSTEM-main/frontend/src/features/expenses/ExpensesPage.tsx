import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  FormControl, InputLabel, Select, IconButton, TablePagination, Chip, Stack, Tooltip,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const CATEGORIES = ['مستلزمات', 'مرافق', 'راتب', 'أخرى'];
const PAYMENT_METHODS = ['نقداً', 'بطاقة', 'تحويل بنكي'];

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string | null;
  notes: string | null;
}

export default function ExpensesPage() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ category: '', amount: 0, date: '', paymentMethod: '', notes: '' });
  const [editing, setEditing] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    api.get('/expenses').then(({ data }) => setExpenses(data));
  }, []);

  const handleOpenAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditing(null);
    setForm({ category: '', amount: 0, date: today, paymentMethod: '', notes: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({ category: exp.category, amount: exp.amount, date: exp.date, paymentMethod: exp.paymentMethod || '', notes: exp.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, form);
      } else {
        await api.post('/expenses', form);
      }
      const { data } = await api.get('/expenses');
      setExpenses(data);
      setDialogOpen(false);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      const { data } = await api.get('/expenses');
      setExpenses(data);
    } catch { /* ignore */ }
  };

  const filtered = useMemo(() => {
    let list = expenses;
    if (selectedMonth) list = list.filter(e => e.date && e.date.startsWith(selectedMonth));
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(e =>
      e.category.toLowerCase().includes(q)
      || e.amount.toString().includes(q)
      || (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q))
      || (e.notes && e.notes.toLowerCase().includes(q))
    );
  }, [expenses, searchQuery, selectedMonth]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalAmount = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('expenses.title')}</Typography>
          <Chip label={`${t('advances.total')}: ${totalAmount.toLocaleString()} YER`} color="warning" />
        </Stack>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          {t('expenses.add')}
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
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
        <TextField size="small" placeholder={t('expenses.search')} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} sx={{ maxWidth: 320 }} />
      </Stack>
      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>{t('expenses.col.category')}</TableCell>
              <TableCell>{t('expenses.col.amount')}</TableCell>
              <TableCell>{t('expenses.col.date')}</TableCell>
              <TableCell>{t('expenses.col.paymentMethod')}</TableCell>
              <TableCell>{t('patients.add.form.notes')}</TableCell>
              <TableCell>{t('expenses.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(exp => (
              <TableRow key={exp.id}>
                <TableCell><Chip label={exp.category} size="small" color="primary" variant="outlined" /></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{exp.amount.toLocaleString()} YER</TableCell>
                <TableCell>{exp.date || '-'}</TableCell>
                <TableCell>{exp.paymentMethod || '-'}</TableCell>
                <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.notes || '-'}</TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleOpenEdit(exp)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(exp.id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('expenses.empty')}</TableCell></TableRow>
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
        <DialogTitle>{editing ? t('expenses.edit') : t('expenses.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('expenses.form.category')}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              fullWidth
            />
            <TextField
              label={t('expenses.form.amount')}
              type="number"
              value={form.amount || ''}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              fullWidth
            />
            <TextField
              label={t('expenses.form.date')}
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl fullWidth>
              <InputLabel>{t('expenses.form.paymentMethod')}</InputLabel>
              <Select
                value={form.paymentMethod}
                label={t('expenses.form.paymentMethod')}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              >
                {PAYMENT_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label={t('expenses.form.notes')}
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
