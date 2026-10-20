import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  FormControl, InputLabel, Select, IconButton, TablePagination, Chip, Stack, Tooltip, Switch,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const DEPARTMENTS = ['علاج طبيعي', 'تغذيه', 'اداره', 'تقنيه معلومات', 'سكارتير', 'حارس'];

interface Employee {
  id: string;
  name: string;
  department: string | null;
  phone: string | null;
  salary: number | null;
  isActive: boolean;
}

export default function EmployeesPage() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', department: '', phone: '', salary: '' });
  const [editing, setEditing] = useState<Employee | null>(null);

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/employees?all=true');
      setEmployees(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(q)
      || (e.department && e.department.toLowerCase().includes(q))
      || (e.phone && e.phone.includes(q))
    );
  }, [employees, searchQuery]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({ name: '', department: '', phone: '', salary: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      name: emp.name,
      department: emp.department || '',
      phone: emp.phone || '',
      salary: emp.salary?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        payload[k] = v === '' ? undefined : v;
      }
      if (editing) {
        await api.put(`/employees/${editing.id}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      await fetchEmployees();
      setDialogOpen(false);
    } catch { /* ignore */ }
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      await api.put(`/employees/${emp.id}`, { isActive: !emp.isActive });
      await fetchEmployees();
    } catch { /* ignore */ }
  };

  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/employees/${selectedId}`);
      await fetchEmployees();
    } catch { /* ignore */ }
    setDeleteOpen(false);
    setSelectedId(null);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('employees.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          {t('employees.add')}
        </Button>
      </Stack>

      <TextField
        size="small" placeholder={t('employees.search')} value={searchQuery}
        onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
        sx={{ mb: 1.5, maxWidth: 320 }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('employees.col.name')}</TableCell>
              <TableCell>{t('employees.col.department')}</TableCell>
              <TableCell>{t('employees.col.phone')}</TableCell>
              <TableCell>{t('employees.col.salary')}</TableCell>
              <TableCell>{t('employees.col.status')}</TableCell>
              <TableCell>{t('employees.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(emp => (
              <TableRow key={emp.id} sx={{ opacity: emp.isActive ? 1 : 0.5 }}>
                <TableCell sx={{ fontWeight: 600 }}>{emp.name}</TableCell>
                <TableCell><Chip label={emp.department || '-'} size="small" variant="outlined" /></TableCell>
                <TableCell>{emp.phone || '-'}</TableCell>
                <TableCell>{emp.salary ? `${emp.salary.toLocaleString()} YER` : '-'}</TableCell>
                <TableCell>
                  <Switch checked={emp.isActive} size="small" onChange={() => handleToggleActive(emp)} />
                </TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleOpenEdit(emp)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => openDelete(emp.id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('employees.empty')}</TableCell></TableRow>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('employees.edit') : t('employees.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={t('employees.form.name')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth required />
            <FormControl fullWidth>
              <InputLabel>{t('employees.form.department')}</InputLabel>
              <Select value={form.department} label={t('employees.form.department')} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label={t('employees.form.phone')} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} fullWidth />
            <TextField label={t('employees.form.salary')} type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
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
