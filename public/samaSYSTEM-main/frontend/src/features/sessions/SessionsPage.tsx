import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, MenuItem, IconButton, Collapse,
  Table, TableHead, TableBody, TableRow, TableCell, Dialog, DialogTitle, DialogContent,
  DialogActions,   FormControl, FormControlLabel, FormLabel, InputLabel, Select, Chip, Pagination, Stack, Radio, RadioGroup,
} from '@mui/material';
import { KeyboardArrowUp, Close, Edit, Delete, Add, FilterList, AccountBalanceWallet } from '@mui/icons-material';
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

interface Payment {
  amount: number;
  date: string;
}

function getInstallmentPayments(s: Session): Payment[] {
  try {
    const d = JSON.parse(s.installments || '{}');
    if (Array.isArray(d)) return d;
    return d.payments || [];
  } catch { return []; }
}

function getInstallmentPaid(s: Session): number {
  return getInstallmentPayments(s).reduce((sum, p) => sum + p.amount, 0);
}

function getInstallmentRemaining(s: Session): number {
  return (s.price || 0) - getInstallmentPaid(s);
}


const typeLabels: Record<string, string> = {
  physiotherapy: 'علاج طبيعي',
  'physiotherapy (adults)': 'جلسات علاج طبيعي (كبار)',
  'physiotherapy (children)': 'جلسات علاج طبيعي (أطفال)',
};

interface Session {
  id: string;
  fullname: string;
  sessionType: string;
  speacial: string | null;
  status: string;
  sessionDate: string | null;
  price: number | null;
  notes: string | null;
  subscriptionPeriod: string | null;
  subscriptionAmount: number | null;
  subscriptionDay: number | null;
  installments: string | null;
  paymentMethod: string | null;
  prepaid?: boolean;
}

interface Employee {
  id: string;
  name: string;
  department: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

const formatDate = (d: string | null) => {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
};

const statusColor = (s: string) => {
  if (s === 'complete') return 'success';
  if (s === 'progress') return 'warning';
  if (s === 'negative') return 'error';
  return 'default';
};

const statusLabel = (s: string, t: (k: string) => string) => {
  if (s === 'complete') return t('sessions.complete');
  if (s === 'progress') return t('sessions.progress');
  if (s === 'negative') return t('sessions.negative');
  return s;
};

export default function SessionsPage() {
  const { t, dir } = useLanguage();
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelHidden, setPanelHidden] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const [statusFilter, setStatusFilter] = useState('');
  const [statusForm, setStatusForm] = useState({ patient: '', sessionType: '', status: '' });
  const [periodFilter, setPeriodFilter] = useState('all');
  const [periodDate, setPeriodDate] = useState('');

  const filteredSessions = sessions.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (s.subscriptionPeriod && s.subscriptionAmount) return false;
    if (periodFilter !== 'all' && periodDate && s.sessionDate) {
      const d = new Date(s.sessionDate);
      const ref = new Date(periodDate);
      if (!isNaN(d.getTime()) && !isNaN(ref.getTime())) {
        let match = false;
        if (periodFilter === 'day') match = d.toISOString().slice(0, 10) === ref.toISOString().slice(0, 10);
        else if (periodFilter === 'week') {
          const weekStart = new Date(ref);
          weekStart.setDate(ref.getDate() - ref.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          match = d >= weekStart && d <= weekEnd;
        } else if (periodFilter === 'month') match = d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
        if (!match) return false;
      }
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.fullname.toLowerCase().includes(q)
      || s.sessionType.toLowerCase().includes(q)
      || (s.speacial && s.speacial.toLowerCase().includes(q))
      || (s.price && s.price.toString().includes(q));
  });
  const totalPages = Math.ceil(filteredSessions.length / rowsPerPage);
  const paginatedSessions = filteredSessions.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const [form, setForm] = useState({
    fullname: '',
    session_type: '',
    speacial: '',
    session_date: '',
    price: '',
    notes: '',
    subscription_period: '',
    subscription_amount: '',
    subscription_day: '',
    payment_method: 'نقد',
    wallet_type: '',
    transaction_number: '',
  });
  const [isSubscribe, setIsSubscribe] = useState(false);
  const [isPrepaid, setIsPrepaid] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { setPage(0); }, [searchQuery, statusFilter]);

  useEffect(() => {
    api.get('/employees', { params: { department: 'علاج طبيعي' } }).then(({ data }) => setEmployees(data)).catch(() => {});
    api.get('/services').then(({ data }) => setServices(data)).catch(() => {});
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setForm(f => ({
      ...f,
      subscription_period: v,
      subscription_day: v === 'شهر' ? '30' : v === 'أسبوع' ? '7' : v === 'يوم' ? '1' : f.subscription_day,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...form };
      if (!isSubscribe) {
        payload.subscription_period = '';
        payload.subscription_amount = '';
        payload.subscription_day = '';
      }
      payload.prepaid = isPrepaid;
      const { data } = await api.post('/sessions', payload);
      setMessage({ text: data.message, type: 'success' });
      setForm({ fullname: '', session_type: '', speacial: '', session_date: '', price: '', notes: '', subscription_period: '', subscription_amount: '', subscription_day: '', payment_method: 'نقد', wallet_type: '', transaction_number: '' });
      setIsSubscribe(false);
      setIsPrepaid(false);
      fetchSessions();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Error', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  const openEdit = async (id: string) => {
    try {
      const { data } = await api.get<Session>(`/sessions/${id}`);
      setSelectedId(id);
      const subPeriod = (data as any).subscription_period || 'شهر';
      const subAmount = (data as any).subscription_amount || '';
      const subDay = (data as any).subscription_day || '';
      setIsSubscribe(!!(subPeriod && subAmount));
      setIsPrepaid(!!(data as any).prepaid);
      setForm({
        fullname: data.fullname,
        session_type: data.sessionType,
        speacial: data.speacial || '',
        session_date: data.sessionDate ? data.sessionDate.substring(0, 16) : '',
        price: data.price?.toString() || '',
        notes: data.notes || '',
        subscription_period: subPeriod,
        subscription_amount: subAmount.toString(),
        subscription_day: subDay,
        payment_method: (data as any).payment_method || '',
        wallet_type: (data as any).wallet_type || '',
        transaction_number: (data as any).transaction_number || '',
      });
      setEditOpen(true);
    } catch { /* ignore */ }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      const payload: any = { ...form };
      if (!isSubscribe) {
        payload.subscription_period = '';
        payload.subscription_amount = '';
        payload.subscription_day = '';
      }
      payload.prepaid = isPrepaid;
      const { data } = await api.put(`/sessions/${selectedId}`, payload);
      setMessage({ text: data.message, type: 'success' });
      setEditOpen(false);
      fetchSessions();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Error', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  const openDelete = (id: string) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      const { data } = await api.delete(`/sessions/${selectedId}`);
      setMessage({ text: data.message, type: 'success' });
      fetchSessions();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Error', type: 'error' });
    }
    setDeleteOpen(false);
    setSelectedId(null);
    setTimeout(() => setMessage(null), 4000);
  };

  const openInstallments = (s: Session) => {
    setSelectedId(s.id);
    setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
    setInstallmentOpen(true);
  };

  const handleAddInstallmentPayment = async () => {
    if (!selectedId || !installmentForm.amount) return;
    const s = sessions.find(x => x.id === selectedId);
    if (!s) return;
    const payments = getInstallmentPayments(s);
    payments.push({ amount: Number(installmentForm.amount), date: installmentForm.date });
    try {
      await api.put(`/sessions/${selectedId}`, {
        installments: JSON.stringify({ payments }),
      });
      setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
      fetchSessions();
    } catch { /* ignore */ }
  };

  const handleDeleteInstallmentPayment = async (idx: number) => {
    if (!selectedId) return;
    const s = sessions.find(x => x.id === selectedId);
    if (!s) return;
    const payments = getInstallmentPayments(s);
    payments.splice(idx, 1);
    try {
      await api.put(`/sessions/${selectedId}`, {
        installments: JSON.stringify({ payments }),
      });
      fetchSessions();
    } catch { /* ignore */ }
  };

  const selectedForInstallment = sessions.find(s => s.id === selectedId);

  const nonCompletedSessions = sessions.filter(s => s.status !== 'complete');
  const uniquePatients = [...new Set(nonCompletedSessions.map(s => s.fullname))].sort();
  const statusSessionTypes = statusForm.patient
    ? [...new Set(nonCompletedSessions.filter(s => s.fullname === statusForm.patient).map(s => s.sessionType))]
    : [];
  const selectedSession = statusForm.patient && statusForm.sessionType
    ? nonCompletedSessions.find(s => s.fullname === statusForm.patient && s.sessionType === statusForm.sessionType)
    : null;

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    try {
      const { data } = await api.put(`/sessions/${selectedSession.id}/status`, { status: statusForm.status });
      setMessage({ text: data.message, type: 'success' });
      setStatusForm({ patient: '', sessionType: '', status: '' });
      fetchSessions();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Error', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  if (panelHidden) return null;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('sessions.title')}</Typography>
      </Box>

      {/* Add Session Form */}
      <Card sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('sessions.add')}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={() => setPanelOpen(o => !o)} sx={{ color: 'text.secondary' }}>
              <KeyboardArrowUp sx={{ transform: panelOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.3s' }} />
            </IconButton>
            <IconButton size="small" onClick={() => setPanelHidden(true)} sx={{ color: 'text.secondary' }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
        <Collapse in={panelOpen}>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ '& .MuiTextField-root': { mb: 2.5 } }}>
              <TextField fullWidth label={t('patients.add.form.name')} value={form.fullname} onChange={handleChange('fullname')} required />

              <TextField select fullWidth label={t('sessions.type')} value={form.session_type} onChange={handleChange('session_type')} required>
                <MenuItem value="" disabled>{t('sessions.type')}</MenuItem>
                {services.map(svc => (
                  <MenuItem key={svc.id} value={svc.name}>{svc.name}</MenuItem>
                ))}
              </TextField>

              <TextField select fullWidth label={t('sessions.therapist')} value={form.speacial} onChange={handleChange('speacial')}>
                <MenuItem value="">{t('sessions.noTherapist')}</MenuItem>
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.name}>{emp.name}</MenuItem>
                ))}
              </TextField>

              <TextField fullWidth label={t('sessions.date')} type="datetime-local" value={form.session_date} onChange={handleChange('session_date')}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <FormControl>
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

              {form.payment_method === 'نقد' && !isSubscribe && (
                <TextField fullWidth label={t('patients.add.form.price')} type="number" value={form.price} onChange={handleChange('price')} required={!isSubscribe && !isPrepaid} disabled={isSubscribe} />
              )}

              {form.payment_method === 'محفظة' && (
                <>
                  {!isSubscribe && <TextField fullWidth label={t('patients.add.form.price')} type="number" value={form.price} onChange={handleChange('price')} required={!isSubscribe && !isPrepaid} disabled={isSubscribe} />}
                  <TextField select fullWidth label="نوع المحفظة" value={form.wallet_type} onChange={handleChange('wallet_type')}>
                    <MenuItem value="">اختر</MenuItem>
                    {WALLET_TYPES.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                  </TextField>
                  <TextField fullWidth label="رقم العملية" value={form.transaction_number} onChange={handleChange('transaction_number')} />
                </>
              )}

              <FormControl>
                <FormLabel sx={{ mb: 0.5 }}>الاشتراكات</FormLabel>
                <RadioGroup row value={isPrepaid ? 'prepaid' : isSubscribe ? 'subscribe' : 'normal'} onChange={e => {
                  const v = e.target.value;
                  setIsSubscribe(v === 'subscribe');
                  setIsPrepaid(v === 'prepaid');
                  if (v === 'prepaid') setForm(f => ({ ...f, subscription_period: '', subscription_amount: '', subscription_day: '', price: '0', notes: 'دفع مسبق' }));
                  else setForm(f => ({ ...f, subscription_period: v === 'subscribe' ? 'شهر' : '', subscription_amount: '', subscription_day: v === 'subscribe' ? '30' : '', price: isPrepaid ? '' : f.price, notes: isPrepaid ? '' : f.notes }));
                }}>
                  <FormControlLabel value="subscribe" control={<Radio size="small" />} label="اشتراك" />
                  <FormControlLabel value="prepaid" control={<Radio size="small" />} label="دفع مسبق" />
                  <FormControlLabel value="normal" control={<Radio size="small" />} label="جلسة عادية" />
                </RadioGroup>
              </FormControl>

              {isSubscribe && (
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="مبلغ الاشتراك" type="number" value={form.subscription_amount} onChange={handleChange('subscription_amount')} />
                  <TextField select fullWidth label="فترة الاشتراك" value={form.subscription_period} onChange={handlePeriodChange}>
                    <MenuItem value="شهر">شهر</MenuItem>
                    <MenuItem value="أسبوع">أسبوع</MenuItem>
                    <MenuItem value="يوم">يوم</MenuItem>
                    <MenuItem value="غير محدد">غير محدد</MenuItem>
                  </TextField>
                  <TextField fullWidth label="عدد الأيام" type="number" value={form.subscription_day} onChange={handleChange('subscription_day')} slotProps={{ htmlInput: { min: 1 } }} />
                </Stack>
              )}

              <TextField fullWidth label={t('patients.add.form.notes')} multiline rows={2} value={form.notes} onChange={handleChange('notes')} />

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" color="warning" onClick={() => { setForm({ fullname: '', session_type: '', speacial: '', session_date: '', price: '', notes: '', subscription_period: '', subscription_amount: '', subscription_day: '', payment_method: 'نقد', wallet_type: '', transaction_number: '' }); setIsSubscribe(false); setIsPrepaid(false); }}>{t('patients.add.form.cancel')}</Button>
                <Button variant="contained" color="success" type="submit">{t('patients.add.form.save')}</Button>
              </Box>
            </Box>
          </CardContent>
        </Collapse>
      </Card>

      {/* Message */}
      <Collapse in={!!message} sx={{ mb: 2 }}>
        <Box sx={{
          p: 2, borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          bgcolor: message?.type === 'success' ? '#2e7d3215' : '#d32f2f15',
          color: message?.type === 'success' ? '#2e7d32' : '#d32f2f',
          border: '1px solid',
          borderColor: message?.type === 'success' ? '#2e7d32' : '#d32f2f',
        }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{message?.text}</Typography>
          <IconButton size="small" onClick={() => setMessage(null)} sx={{ color: 'inherit' }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Collapse>

      {/* Price List */}
      <Card sx={{ mb: 2 }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>قائمة الأسعار</Typography>
        </Box>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
            {services.map(s => (
              <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, py: 0.8, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2">{s.name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>{s.price} ريال</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Patient Status Follow-up */}
      <Card sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>متابعة حالة المريض</Typography>
        </Box>
        <CardContent>
          <Box component="form" onSubmit={handleStatusChange} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>اختر المريض</InputLabel>
                <Select value={statusForm.patient} onChange={e => setStatusForm({ patient: e.target.value, sessionType: '', status: '' })} label="اختر المريض" required>
                  <MenuItem value="" disabled>اختر المريض</MenuItem>
                  {uniquePatients.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>نوع الجلسة</InputLabel>
                <Select value={statusForm.sessionType} onChange={e => setStatusForm(prev => ({ ...prev, sessionType: e.target.value }))} label="نوع الجلسة" required disabled={!statusForm.patient}>
                  <MenuItem value="" disabled>نوع الجلسة</MenuItem>
                  {statusSessionTypes.map(st => <MenuItem key={st} value={st}>{st}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>حالة المريض</InputLabel>
                <Select value={statusForm.status} onChange={e => setStatusForm(prev => ({ ...prev, status: e.target.value }))} label="حالة المريض" required disabled={!selectedSession}>
                  <MenuItem value="" disabled>حالة المريض</MenuItem>
                  <MenuItem value="complete">الحالة مكتملة</MenuItem>
                  <MenuItem value="progress">قيد المتابعة</MenuItem>
                  <MenuItem value="negative">حالة سلبية</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="contained" color="success" type="submit" disabled={!selectedSession}>حفظ</Button>
              <Button variant="outlined" color="warning" type="reset" onClick={() => setStatusForm({ patient: '', sessionType: '', status: '' })}>إعادة تعيين</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('sessions.list')}</Typography>
        </Box>
        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('sessions.search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{ maxWidth: 320 }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[
              { label: t('sessions.all'), value: '' },
              { label: t('sessions.complete'), value: 'complete' },
              { label: t('sessions.progress'), value: 'progress' },
              { label: t('sessions.negative'), value: 'negative' },
            ].map(opt => (
              <Button
                key={opt.value}
                size="small"
                variant={statusFilter === opt.value ? 'contained' : 'outlined'}
                color={opt.value === 'complete' ? 'success' : opt.value === 'progress' ? 'warning' : opt.value === 'negative' ? 'error' : 'primary'}
                onClick={() => setStatusFilter(opt.value)}
                sx={{ minWidth: 60, fontSize: '0.75rem' }}
              >
                {opt.label}
              </Button>
            ))}
          </Box>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>الفترة</InputLabel>
            <Select value={periodFilter} label="الفترة" onChange={e => { setPeriodFilter(e.target.value); setPeriodDate(''); }}>
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="day">يوم</MenuItem>
              <MenuItem value="week">أسبوع</MenuItem>
              <MenuItem value="month">شهر</MenuItem>
            </Select>
          </FormControl>
          {periodFilter !== 'all' && (
            <TextField
              size="small"
              type={periodFilter === 'month' ? 'month' : 'date'}
              value={periodDate}
              onChange={e => setPeriodDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ maxWidth: 180 }}
            />
          )}
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'action.hover' } }}>
                <TableCell>{t('patients.add.form.name')}</TableCell>
                <TableCell>{t('sessions.type')}</TableCell>
                <TableCell>{t('sessions.therapist')}</TableCell>
                <TableCell>{t('sessions.status')}</TableCell>
                <TableCell>{t('sessions.date')}</TableCell>
                <TableCell>{t('patients.add.form.price')}</TableCell>
                <TableCell>الأقساط</TableCell>
                <TableCell>{t('patients.add.form.notes')}</TableCell>
                <TableCell>{t('patients.col.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSessions.map(s => {
                const paidAmt = getInstallmentPaid(s);
                const remainingAmt = getInstallmentRemaining(s);
                const hasInstallments = s.installments && s.installments !== '';
                return (
                <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{s.fullname}</TableCell>
                  <TableCell>{typeLabels[s.sessionType] || s.sessionType}</TableCell>
                  <TableCell>{s.speacial || '-'}</TableCell>
                  <TableCell>
                    <Chip label={statusLabel(s.status, t)} color={statusColor(s.status) as any} size="small" />
                  </TableCell>
                  <TableCell>{formatDate(s.sessionDate)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{s.price ?? ''}</TableCell>
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
                  <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes || '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => openEdit(s.id)} sx={{ bgcolor: '#007bff15', color: '#007bff', '&:hover': { bgcolor: '#007bff25' } }}>
                        <Edit sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => openInstallments(s)} sx={{ bgcolor: '#28a74515', color: '#28a745', '&:hover': { bgcolor: '#28a74525' } }}>
                        <AccountBalanceWallet sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => openDelete(s.id)} sx={{ bgcolor: '#dc354515', color: '#dc3545', '&:hover': { bgcolor: '#dc354525' } }}>
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );})}
              {filteredSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    {searchQuery ? `${t('sessions.empty')} — "${searchQuery}"` : t('sessions.empty')}
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

      {/* Edit Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('sessions.edit')}</DialogTitle>
          <DialogContent>
            <TextField fullWidth label={t('patients.add.form.name')} value={form.fullname} onChange={handleChange('fullname')} sx={{ mb: 2 }} required />

              <TextField fullWidth label={t('sessions.type')} value={form.session_type} onChange={handleChange('session_type')} sx={{ mb: 2 }} required />

            <TextField select fullWidth label={t('sessions.therapist')} value={form.speacial} onChange={handleChange('speacial')} sx={{ mb: 2 }}>
              <MenuItem value="">{t('sessions.noTherapist')}</MenuItem>
              {employees.map(emp => (
                <MenuItem key={emp.id} value={emp.name}>{emp.name}</MenuItem>
              ))}
            </TextField>

            <TextField fullWidth label={t('sessions.date')} type="datetime-local" value={form.session_date} onChange={handleChange('session_date')} sx={{ mb: 2 }} slotProps={{ inputLabel: { shrink: true } }} />

            <FormControl sx={{ mb: 2 }}>
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

            {form.payment_method === 'نقد' && !isSubscribe && (
              <TextField fullWidth label={t('patients.add.form.price')} type="number" value={form.price} onChange={handleChange('price')} sx={{ mb: 2 }} required={!isSubscribe && !isPrepaid} disabled={isSubscribe} />
            )}

            {form.payment_method === 'محفظة' && (
              <>
                {!isSubscribe && <TextField fullWidth label={t('patients.add.form.price')} type="number" value={form.price} onChange={handleChange('price')} sx={{ mb: 2 }} required={!isSubscribe && !isPrepaid} disabled={isSubscribe} />}
                <TextField select fullWidth label="نوع المحفظة" value={form.wallet_type} onChange={handleChange('wallet_type')} sx={{ mb: 2 }}>
                  <MenuItem value="">اختر</MenuItem>
                  {WALLET_TYPES.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                </TextField>
                <TextField fullWidth label="رقم العملية" value={form.transaction_number} onChange={handleChange('transaction_number')} sx={{ mb: 2 }} />
              </>
            )}

            <FormControl sx={{ mb: 2 }}>
              <FormLabel sx={{ mb: 0.5 }}>الاشتراكات</FormLabel>
              <RadioGroup row value={isPrepaid ? 'prepaid' : isSubscribe ? 'subscribe' : 'normal'} onChange={e => {
                const v = e.target.value;
                setIsSubscribe(v === 'subscribe');
                setIsPrepaid(v === 'prepaid');
                if (v === 'prepaid') setForm(f => ({ ...f, subscription_period: '', subscription_amount: '', subscription_day: '', price: '0', notes: 'دفع مسبق' }));
                else setForm(f => ({ ...f, subscription_period: v === 'subscribe' ? 'شهر' : '', subscription_amount: '', subscription_day: v === 'subscribe' ? '30' : '', price: isPrepaid ? '' : f.price, notes: isPrepaid ? '' : f.notes }));
              }}>
                <FormControlLabel value="subscribe" control={<Radio size="small" />} label="اشتراك" />
                <FormControlLabel value="prepaid" control={<Radio size="small" />} label="دفع مسبق" />
                <FormControlLabel value="normal" control={<Radio size="small" />} label="جلسة عادية" />
              </RadioGroup>
            </FormControl>

            {isSubscribe && (
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField fullWidth label="مبلغ الاشتراك" type="number" value={form.subscription_amount} onChange={handleChange('subscription_amount')} />
                <TextField select fullWidth label="فترة الاشتراك" value={form.subscription_period} onChange={handlePeriodChange}>
                  <MenuItem value="شهر">شهر</MenuItem>
                  <MenuItem value="أسبوع">أسبوع</MenuItem>
                  <MenuItem value="يوم">يوم</MenuItem>
                  <MenuItem value="غير محدد">غير محدد</MenuItem>
                </TextField>
                <TextField fullWidth label="عدد الأيام" type="number" value={form.subscription_day} onChange={handleChange('subscription_day')} slotProps={{ htmlInput: { min: 1 } }} />
              </Stack>
            )}

            <TextField fullWidth label={t('patients.add.form.notes')} multiline rows={2} value={form.notes} onChange={handleChange('notes')} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(false)} color="secondary">{t('patients.add.form.cancel')}</Button>
            <Button type="submit" variant="contained" color="primary">{t('sessions.save')}</Button>
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

      {/* Delete Modal */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('patients.delete.title')}</DialogTitle>
        <DialogContent>
          <Typography>{t('patients.delete.confirm')}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="secondary">{t('patients.add.form.cancel')}</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">{t('patients.delete.confirmBtn')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
