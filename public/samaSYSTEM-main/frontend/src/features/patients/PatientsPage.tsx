import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, MenuItem, IconButton, Collapse,
  InputAdornment, CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
  Pagination, Dialog, DialogTitle, DialogContent, DialogActions, Select, FormControl, InputLabel,
  FormControlLabel, FormLabel, Radio, RadioGroup, Chip, Stack,
} from '@mui/material';
import { KeyboardArrowUp, Close, CalendarMonth, Edit, Delete, DownloadForOffline, AccountBalanceWallet, Description } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

const WALLET_TYPES = [
  'جوالي', 'WeCash', 'جيب', 'AHD Financial',
  'موبايل موني', 'كاك بنك',
  'فلوسك', 'بنك الكريمي للتمويل الأصغر الإسلامي',
  'ONE Cash', 'كاش', 'Tamkeen Financial',
  'شامل موني', 'بنك شامل',
  'سبأ كاش', 'محفظتي', 'أم فلوس',
];

interface Patient {
  id: string;
  serialNumber: number;
  manualId: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  examType: string | null;
  gender: string | null;
  price: number | null;
  registrationDate: string | null;
  dateOfBirth: string | null;
  paymentMethod: string | null;
  walletType: string | null;
  transactionNumber: string | null;
  installments: string | null;
}

interface Payment {
  amount: number;
  date: string;
}

function getInstallmentPayments(s: Patient): Payment[] {
  try {
    const d = JSON.parse(s.installments || '{}');
    if (Array.isArray(d)) return d;
    return d.payments || [];
  } catch { return []; }
}

function getInstallmentPaid(s: Patient): number {
  return getInstallmentPayments(s).reduce((sum, p) => sum + p.amount, 0);
}

function getInstallmentRemaining(s: Patient): number {
  return (s.price || 0) - getInstallmentPaid(s);
}

export default function PatientsPage() {
  const { t, locale } = useLanguage();

  const [addOpen, setAddOpen] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rowsPerPage = 10;

  const [form, setForm] = useState({
    examType: '', fullName: '', manualId: '', age: '', gender: '', phone: '', date: '', price: '',
    payment_method: 'نقد', wallet_type: '', transaction_number: '',
  });

  const [editForm, setEditForm] = useState({
    examType: '', fullName: '', manualId: '', age: '', gender: '', phone: '', date: '', price: '',
    payment_method: 'نقد', wallet_type: '', transaction_number: '',
  });

  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

  const calcAge = (dob: string | null) => {
    if (!dob) return '';
    return (new Date().getFullYear() - new Date(dob).getFullYear()).toString();
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  };

  const fetchPatients = useCallback(async () => {
    try { const { data } = await api.get('/patients'); setPatients(data); } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { setPage(0); }, [searchQuery]);

  const filteredPatients = patients.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase();
    const age = calcAge(p.dateOfBirth);
    const date = formatDate(p.registrationDate);
    const exam = t(p.examType === 'nutrition' ? 'patients.add.form.examType.nutrition' : 'patients.add.form.examType.physiotherapy').toLowerCase();
    return name.includes(q) || exam.includes(q) || (p.phone && p.phone.includes(q)) || age.includes(q) || date.includes(q) || (p.price && p.price.toString().includes(q)) || (p.manualId && p.manualId.includes(q));
  });
  const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
  const paginatedPatients = filteredPatients.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post('/patients', form);
      setMessage({ text: t('patients.add.form.saved'), type: 'success' });
      setForm({ examType: '', fullName: '', manualId: '', age: '', gender: '', phone: '', date: '', price: '', payment_method: 'نقد', wallet_type: '', transaction_number: '' });
      fetchPatients();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Error saving patient', type: 'error' });
    }
    setSubmitting(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleReset = () => {
    setForm({ examType: '', fullName: '', manualId: '', age: '', gender: '', phone: '', date: '', price: '', payment_method: 'نقد', wallet_type: '', transaction_number: '' });
  };

  const openEdit = async (id: string) => {
    try {
      const { data: p } = await api.get<Patient>(`/patients/${id}`);
      const age = calcAge(p.dateOfBirth);
      setSelectedId(id);
      setEditForm({
        examType: p.examType || '',
        fullName: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
        manualId: p.manualId || '',
        age,
        gender: p.gender || '',
        phone: p.phone || '',
        date: formatDate(p.registrationDate),
        price: p.price?.toString() || '',
        payment_method: p.paymentMethod || 'نقد',
        wallet_type: p.walletType || '',
        transaction_number: p.transactionNumber || '',
      });
      setEditOpen(true);
    } catch { /* ignore */ }
  };

  const handleEditChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      const { data } = await api.put(`/patients/${selectedId}`, editForm);
      setMessage({ text: data.message, type: 'success' });
      setEditOpen(false);
      fetchPatients();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Error', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      const { data } = await api.delete(`/patients/${selectedId}`);
      setMessage({ text: data.message, type: 'success' });
      fetchPatients();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Error', type: 'error' });
    }
    setDeleteOpen(false);
    setSelectedId(null);
    setTimeout(() => setMessage(null), 4000);
  };

  const openInstallments = (p: Patient) => {
    setSelectedId(p.id);
    setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
    setInstallmentOpen(true);
  };

  const handleAddInstallmentPayment = async () => {
    if (!selectedId || !installmentForm.amount) return;
    const p = patients.find(x => x.id === selectedId);
    if (!p) return;
    const payments = getInstallmentPayments(p);
    payments.push({ amount: Number(installmentForm.amount), date: installmentForm.date });
    try {
      await api.put(`/patients/${selectedId}`, {
        installments: JSON.stringify({ payments }),
      });
      setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
      fetchPatients();
    } catch { /* ignore */ }
  };

  const handleDeleteInstallmentPayment = async (idx: number) => {
    if (!selectedId) return;
    const p = patients.find(x => x.id === selectedId);
    if (!p) return;
    const payments = getInstallmentPayments(p);
    payments.splice(idx, 1);
    try {
      await api.put(`/patients/${selectedId}`, {
        installments: JSON.stringify({ payments }),
      });
      fetchPatients();
    } catch { /* ignore */ }
  };

  const downloadPatientFile = (p: Patient) => {
    const token = localStorage.getItem('accessToken');
    const base = import.meta.env.VITE_API_URL || '';
    window.open(`${base ? `${base}/api` : '/api'}/patients/${p.id}/file?lang=en&token=${token}`, '_blank');
  };

  const downloadExcel = async () => {
    try {
      const { data: blob } = await api.get('/patients/export', { params: { lang: locale }, responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'patients-report.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const selectedForInstallment = patients.find(p => p.id === selectedId);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('patients.title')}</Typography>
      </Box>

      {/* Add Patient Form */}
      <Card sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('patients.add.form.details')}</Typography>
          <IconButton size="small" onClick={() => setAddOpen(o => !o)} sx={{ color: 'text.secondary' }}>
            <KeyboardArrowUp sx={{ transform: addOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.3s' }} />
          </IconButton>
        </Box>
        <Collapse in={addOpen}>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ '& .MuiTextField-root': { mb: 2.5 } }}>
              <TextField select fullWidth label={t('patients.add.form.examType')} value={form.examType} onChange={handleChange('examType')} required>
                <MenuItem value="" disabled>{t('patients.add.form.examType')}</MenuItem>
                <MenuItem value="physiotherapy">{t('patients.add.form.examType.physiotherapy')}</MenuItem>
                <MenuItem value="nutrition">{t('patients.add.form.examType.nutrition')}</MenuItem>
              </TextField>
              <TextField fullWidth label={t('patients.add.form.name')} value={form.fullName} onChange={handleChange('fullName')} required />
              <TextField fullWidth label={t('patients.add.form.manualId')} value={form.manualId} onChange={handleChange('manualId')} />
              <TextField fullWidth label={t('patients.add.form.age')} type="number" value={form.age} onChange={handleChange('age')} />
              <TextField select fullWidth label={t('patients.add.form.gender')} value={form.gender} onChange={handleChange('gender')} required>
                <MenuItem value="" disabled>{t('patients.add.form.gender')}</MenuItem>
                <MenuItem value="male">{t('patients.add.form.gender.male')}</MenuItem>
                <MenuItem value="female">{t('patients.add.form.gender.female')}</MenuItem>
              </TextField>
              <TextField fullWidth label={t('patients.add.form.phone')} value={form.phone} onChange={handleChange('phone')}
                placeholder="+967" required
                slotProps={{ input: { sx: { dir: 'ltr' } } }}
              />
              <TextField fullWidth label={t('patients.add.form.date')} type="date" value={form.date} onChange={handleChange('date')}
                slotProps={{ inputLabel: { shrink: true }, input: { endAdornment: <InputAdornment position="end"><CalendarMonth /></InputAdornment> } }}
              />

              <FormControl sx={{ mb: 2.5 }}>
                <FormLabel sx={{ mb: 0.5 }}>طريقة الدفع</FormLabel>
                <RadioGroup row value={form.payment_method || 'نقد'} onChange={e => {
                  const v = e.target.value;
                  if (v === 'محفظة') setForm(f => ({ ...f, payment_method: v }));
                  else setForm(f => ({ ...f, payment_method: v, wallet_type: '', transaction_number: '' }));
                }}>
                  <FormControlLabel value="نقد" control={<Radio size="small" />} label="نقد" />
                  <FormControlLabel value="محفظة" control={<Radio size="small" />} label="محفظة" />
                </RadioGroup>
              </FormControl>

              {form.payment_method === 'محفظة' && (
                <>
                  <TextField fullWidth label={t('patients.add.form.price')} type="number" value={form.price} onChange={handleChange('price')} />
                  <TextField select fullWidth label="نوع المحفظة" value={form.wallet_type} onChange={handleChange('wallet_type')}>
                    <MenuItem value="">اختر</MenuItem>
                    {WALLET_TYPES.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                  </TextField>
                  <TextField fullWidth label="رقم العملية" value={form.transaction_number} onChange={handleChange('transaction_number')} />
                </>
              )}

              {form.payment_method !== 'محفظة' && (
                <TextField fullWidth label={t('patients.add.form.price')} type="number" value={form.price} onChange={handleChange('price')} />
              )}

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" color="warning" onClick={handleReset}>{t('patients.add.form.cancel')}</Button>
                <Button variant="outlined" color="secondary" type="reset" onClick={handleReset}>{t('patients.add.form.reset')}</Button>
                <Button variant="contained" color="success" type="submit" disabled={submitting}>
                  {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                  {t('patients.add.form.save')}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Collapse>
      </Card>

      {/* Toast Message */}
      <Collapse in={!!message}>
        <Box sx={{ p: 2, borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2,
          bgcolor: message?.type === 'success' ? '#2e7d3215' : '#d32f2f15',
          color: message?.type === 'success' ? '#2e7d32' : '#d32f2f',
          border: '1px solid', borderColor: message?.type === 'success' ? '#2e7d32' : '#d32f2f',
        }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{message?.text}</Typography>
          <IconButton size="small" onClick={() => setMessage(null)} sx={{ color: 'inherit' }}><Close sx={{ fontSize: 18 }} /></IconButton>
        </Box>
      </Collapse>

      {/* Patient List */}
      <Card>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('patients.list')}</Typography>
          <Button variant="contained" color="primary" startIcon={<Description />} onClick={() => setReportOpen(true)}>
            {t('patients.report.title')}
          </Button>
        </Box>
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <TextField
            size="small" placeholder={t('patients.search')} value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} sx={{ maxWidth: 320 }}
          />
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'action.hover' } }}>
                <TableCell>{t('patients.col.serial')}</TableCell>
                <TableCell>{t('patients.add.form.examType')}</TableCell>
                <TableCell>{t('patients.add.form.name')}</TableCell>
                <TableCell>{t('patients.add.form.manualId')}</TableCell>
                <TableCell>{t('patients.add.form.age')}</TableCell>
                <TableCell>{t('patients.add.form.phone')}</TableCell>
                <TableCell>{t('patients.add.form.date')}</TableCell>
                <TableCell>طريقة الدفع</TableCell>
                <TableCell>{t('patients.add.form.price')}</TableCell>
                <TableCell>الأقساط</TableCell>
                <TableCell>{t('patients.col.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPatients.map(p => {
                const paidAmt = getInstallmentPaid(p);
                const remainingAmt = getInstallmentRemaining(p);
                const hasInstallments = p.installments && p.installments !== '';
                return (
                <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 700 }}>{p.serialNumber}</TableCell>
                  <TableCell>{t(p.examType === 'nutrition' ? 'patients.add.form.examType.nutrition' : 'patients.add.form.examType.physiotherapy')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{`${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—'}</TableCell>
                  <TableCell>{p.manualId || '—'}</TableCell>
                  <TableCell>{calcAge(p.dateOfBirth)}</TableCell>
                  <TableCell dir="ltr">{p.phone}</TableCell>
                  <TableCell>{formatDate(p.registrationDate)}</TableCell>
                  <TableCell>
                    <Chip label={p.paymentMethod || 'نقد'} size="small" color={p.paymentMethod === 'محفظة' ? 'primary' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{p.price ?? ''}</TableCell>
                  <TableCell>
                    {hasInstallments ? (
                      <Chip
                        label={remainingAmt > 0 ? `${paidAmt.toLocaleString()} / ${(paidAmt + remainingAmt).toLocaleString()}` : `✔ ${paidAmt.toLocaleString()}`}
                        size="small"
                        color={remainingAmt > 0 ? 'warning' : 'success'}
                        variant="outlined"
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => downloadPatientFile(p)} sx={{ bgcolor: '#28a74515', color: '#28a745', '&:hover': { bgcolor: '#28a74525' } }} title={t('patients.download.file')}>
                        <DownloadForOffline sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => openInstallments(p)} sx={{ bgcolor: '#28a74515', color: '#28a745', '&:hover': { bgcolor: '#28a74525' } }}>
                        <AccountBalanceWallet sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => openEdit(p.id)} sx={{ bgcolor: '#007bff15', color: '#007bff', '&:hover': { bgcolor: '#007bff25' } }}>
                        <Edit sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => openDelete(p.id)} sx={{ bgcolor: '#dc354515', color: '#dc3545', '&:hover': { bgcolor: '#dc354525' } }}>
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );})}
              {filteredPatients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    {searchQuery ? t('patients.searchEmpty') || 'No results match your search' : t('patients.empty')}
                  </TableCell>
                </TableRow>
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('patients.edit.title')}</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
              <InputLabel>{t('patients.add.form.examType')}</InputLabel>
              <Select value={editForm.examType} onChange={e => setEditForm(prev => ({ ...prev, examType: e.target.value }))} label={t('patients.add.form.examType')} required>
                <MenuItem value="physiotherapy">{t('patients.add.form.examType.physiotherapy')}</MenuItem>
                <MenuItem value="nutrition">{t('patients.add.form.examType.nutrition')}</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label={t('patients.add.form.name')} value={editForm.fullName} onChange={handleEditChange('fullName')} sx={{ mb: 2 }} required />
            <TextField fullWidth label={t('patients.add.form.manualId')} value={editForm.manualId} onChange={handleEditChange('manualId')} sx={{ mb: 2 }} />
            <TextField fullWidth label={t('patients.add.form.age')} type="number" value={editForm.age} onChange={handleEditChange('age')} sx={{ mb: 2 }} />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('patients.add.form.gender')}</InputLabel>
              <Select value={editForm.gender} onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))} label={t('patients.add.form.gender')} required>
                <MenuItem value="male">{t('patients.add.form.gender.male')}</MenuItem>
                <MenuItem value="female">{t('patients.add.form.gender.female')}</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label={t('patients.add.form.phone')} value={editForm.phone} onChange={handleEditChange('phone')} sx={{ mb: 2 }} />
            <TextField fullWidth label={t('patients.add.form.date')} type="date" value={editForm.date} onChange={handleEditChange('date')} sx={{ mb: 2 }} slotProps={{ inputLabel: { shrink: true } }} />

            <FormControl sx={{ mb: 2 }}>
              <FormLabel sx={{ mb: 0.5 }}>طريقة الدفع</FormLabel>
              <RadioGroup row value={editForm.payment_method || 'نقد'} onChange={e => {
                const v = e.target.value;
                if (v === 'محفظة') setEditForm(f => ({ ...f, payment_method: v }));
                else setEditForm(f => ({ ...f, payment_method: v, wallet_type: '', transaction_number: '' }));
              }}>
                <FormControlLabel value="نقد" control={<Radio size="small" />} label="نقد" />
                <FormControlLabel value="محفظة" control={<Radio size="small" />} label="محفظة" />
              </RadioGroup>
            </FormControl>

            {editForm.payment_method === 'محفظة' && (
              <>
                <TextField fullWidth label={t('patients.add.form.price')} type="number" value={editForm.price} onChange={handleEditChange('price')} sx={{ mb: 2 }} />
                <TextField select fullWidth label="نوع المحفظة" value={editForm.wallet_type} onChange={handleEditChange('wallet_type')} sx={{ mb: 2 }}>
                  <MenuItem value="">اختر</MenuItem>
                  {WALLET_TYPES.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                </TextField>
                <TextField fullWidth label="رقم العملية" value={editForm.transaction_number} onChange={handleEditChange('transaction_number')} sx={{ mb: 2 }} />
              </>
            )}

            {editForm.payment_method !== 'محفظة' && (
              <TextField fullWidth label={t('patients.add.form.price')} type="number" value={editForm.price} onChange={handleEditChange('price')} sx={{ mb: 2 }} />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(false)} color="secondary">{t('patients.add.form.cancel')}</Button>
            <Button type="submit" variant="contained" color="primary">{t('patients.edit.save')}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Installment Dialog */}
      <Dialog open={installmentOpen} onClose={() => setInstallmentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>الأقساط</DialogTitle>
        <DialogContent>
          {selectedForInstallment && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`المبلغ: ${selectedForInstallment.price?.toLocaleString()} YER`} color="primary" variant="outlined" />
                <Chip label={`المدفوع: ${getInstallmentPaid(selectedForInstallment).toLocaleString()} YER`} color="success" variant="filled" />
                <Chip label={`المتبقي: ${getInstallmentRemaining(selectedForInstallment).toLocaleString()} YER`} color={getInstallmentRemaining(selectedForInstallment) > 0 ? 'error' : 'default'} variant="filled" />
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.secondary', mt: 1 }}>سجل الدفعات</Typography>
              {getInstallmentPayments(selectedForInstallment).length === 0 && (
                <Typography variant="body2" color="text.disabled">لا توجد دفعات مسجلة</Typography>
              )}
              {getInstallmentPayments(selectedForInstallment).map((p, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f5f5f5', borderRadius: 1, px: 2, py: 1 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{p.amount.toLocaleString()} YER</Typography>
                    <Typography variant="caption" color="text.secondary">{p.date}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleDeleteInstallmentPayment(i)} sx={{ color: '#dc3545' }}>
                    <Delete sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              ))}

              <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.secondary', mt: 1 }}>إضافة دفعة جديدة</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField size="small" label="المبلغ" type="number" value={installmentForm.amount} onChange={e => setInstallmentForm(f => ({ ...f, amount: e.target.value }))} sx={{ width: 150 }} />
                <TextField size="small" label="التاريخ" type="date" value={installmentForm.date} onChange={e => setInstallmentForm(f => ({ ...f, date: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
                <Button variant="contained" size="small" onClick={handleAddInstallmentPayment} sx={{ mt: 0.5, whiteSpace: 'nowrap', minWidth: 80, height: 40 }}>إضافة</Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInstallmentOpen(false)} color="secondary">إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Patients Report Dialog */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          {t('patients.report.title')}
          <Button variant="contained" color="success" startIcon={<DownloadForOffline />} onClick={downloadExcel}>
            {t('patients.report.download')}
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ overflowX: 'auto', maxHeight: '60vh' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'action.hover' } }}>
                  <TableCell>{t('patients.add.form.examType')}</TableCell>
                  <TableCell>{t('patients.add.form.name')}</TableCell>
                  <TableCell>{t('patients.add.form.manualId')}</TableCell>
                  <TableCell>{t('patients.add.form.age')}</TableCell>
                  <TableCell>{t('patients.add.form.phone')}</TableCell>
                  <TableCell>{t('patients.add.form.date')}</TableCell>
                  <TableCell>طريقة الدفع</TableCell>
                  <TableCell>{t('patients.add.form.price')}</TableCell>
                  <TableCell>{t('patients.report.paid')}</TableCell>
                  <TableCell>{t('patients.report.remaining')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map(p => (
                  <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>{t(p.examType === 'nutrition' ? 'patients.add.form.examType.nutrition' : 'patients.add.form.examType.physiotherapy')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{`${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—'}</TableCell>
                    <TableCell>{p.manualId || '—'}</TableCell>
                    <TableCell>{calcAge(p.dateOfBirth)}</TableCell>
                    <TableCell dir="ltr">{p.phone}</TableCell>
                    <TableCell>{formatDate(p.registrationDate)}</TableCell>
                    <TableCell>{p.paymentMethod || 'نقد'}</TableCell>
                    <TableCell>{p.price ?? ''}</TableCell>
                    <TableCell>{getInstallmentPaid(p).toLocaleString()}</TableCell>
                    <TableCell>{getInstallmentRemaining(p).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {patients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>{t('patients.empty')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReportOpen(false)} color="secondary">{t('patients.add.form.cancel')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
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
