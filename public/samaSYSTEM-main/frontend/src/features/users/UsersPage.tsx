import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  FormControl, InputLabel, Select, IconButton, TablePagination, Chip, Stack, Switch, Tooltip,
  Checkbox, ListItemText, OutlinedInput,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const ROLES = ['ADMIN', 'SUPERVISOR', 'RECEPTIONIST', 'THERAPIST'];

const ALL_PERMISSIONS = [
  'dashboard', 'patients', 'sessions', 'appointments', 'calendar',
  'services', 'coverages', 'invoices', 'website', 'subscribers',
  'wallet-transfers', 'advances', 'expenses', 'employees', 'users',
  'reports', 'receivables', 'financial-summary', 'notifications', 'chat',
];

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
}

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: '', password: '', firstName: '', lastName: '',
    phone: '', role: 'RECEPTIONIST', permissions: [] as string[],
  });

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const resetForm = () => {
    setForm({ username: '', password: '', firstName: '', lastName: '', phone: '', role: 'RECEPTIONIST', permissions: [] });
  };

  const handleOpenAdd = () => {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditing(user);
    setForm({
      username: user.username,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
      permissions: user.permissions,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const payload: any = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editing.id}`, payload);
      } else {
        await api.post('/users', form);
      }
      await fetchUsers();
      setDialogOpen(false);
    } catch (e: any) { alert(JSON.stringify(e?.response?.data, null, 2) || e?.message || 'Error saving user'); }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}/status`, { isActive: !user.isActive });
      await fetchUsers();
    } catch { /* ignore */ }
  };

  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/users/${selectedId}`);
      await fetchUsers();
    } catch { /* ignore */ }
    setDeleteOpen(false);
    setSelectedId(null);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('users.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          {t('users.add')}
        </Button>
      </Stack>

      <TextField
        size="small" placeholder={t('users.search')} value={searchQuery}
        onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
        sx={{ mb: 1.5, maxWidth: 320 }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('users.col.username')}</TableCell>
              <TableCell>{t('users.col.name')}</TableCell>
              <TableCell>{t('users.col.role')}</TableCell>
              <TableCell>{t('users.col.phone')}</TableCell>
              <TableCell>{t('users.col.status')}</TableCell>
              <TableCell>{t('users.col.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(u => (
              <TableRow key={u.id} sx={{ opacity: u.isActive ? 1 : 0.5 }}>
                <TableCell sx={{ fontWeight: 600 }}>{u.username}</TableCell>
                <TableCell>{u.firstName} {u.lastName}</TableCell>
                <TableCell><Chip label={u.role} size="small" color={u.role === 'ADMIN' ? 'error' : u.role === 'THERAPIST' ? 'primary' : 'default'} variant="outlined" /></TableCell>
                <TableCell>{u.phone || '-'}</TableCell>
                <TableCell>
                  <Switch checked={u.isActive} size="small" onChange={() => handleToggleActive(u)} />
                </TableCell>
                <TableCell>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => handleOpenEdit(u)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton size="small" color="error" onClick={() => openDelete(u.id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{t('users.empty')}</TableCell></TableRow>
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
        <DialogTitle>{editing ? t('users.edit') : t('users.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={t('users.form.username')} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} fullWidth required disabled={!!editing} />
            <Stack direction="row" spacing={2}>
              <TextField label={t('users.form.firstName')} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} fullWidth required />
              <TextField label={t('users.form.lastName')} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} fullWidth required />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label={t('users.form.phone')} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} fullWidth />
              <FormControl fullWidth>
                <InputLabel>{t('users.form.role')}</InputLabel>
                <Select value={form.role} label={t('users.form.role')} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <TextField label={editing ? t('users.form.passwordNew') : t('users.form.password')} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} fullWidth required={!editing} />
            <FormControl fullWidth>
              <InputLabel>{t('users.form.permissions')}</InputLabel>
              <Select
                multiple
                value={form.permissions}
                label={t('users.form.permissions')}
                onChange={e => setForm(f => ({ ...f, permissions: e.target.value as string[] }))}
                input={<OutlinedInput label={t('users.form.permissions')} />}
                renderValue={(selected) => (selected as string[]).join(', ')}
              >
                {ALL_PERMISSIONS.map(p => (
                  <MenuItem key={p} value={p}>
                    <Checkbox checked={form.permissions.includes(p)} />
                    <ListItemText primary={p} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('users.delete.title')}</DialogTitle>
        <DialogContent><Typography>{t('users.delete.confirm')}</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="secondary">{t('patients.add.form.cancel')}</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">{t('users.delete.confirmBtn')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
