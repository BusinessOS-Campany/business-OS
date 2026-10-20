import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, IconButton, Pagination, Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Checkbox, Tooltip, Chip } from '@mui/material';
import { Edit, Delete, Close, Download, Autorenew, AccountBalanceWallet } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface Session {
  id: string;
  fullname: string;
  sessionType: string;
  speacial: string | null;
  sessionDate: string | null;
  price: number | null;
  subscriptionPeriod: string | null;
  subscriptionAmount: number | null;
  subscriptionDay: number | null;
  subscriptionAttendance: string | null;
  installments: string | null;
}

interface Payment {
  amount: number;
  date: string;
}

function getInstallments(s: Session): Payment[] {
  try {
    const d = JSON.parse(s.installments || '{}');
    if (Array.isArray(d)) return d;
    return d.payments || [];
  } catch { return []; }
}

function getPaid(s: Session): number {
  return getInstallments(s).reduce((sum, p) => sum + p.amount, 0);
}

function getRemaining(s: Session): number {
  return (s.subscriptionAmount || 0) - getPaid(s);
}

const typeLabels: Record<string, string> = {
  physiotherapy: 'علاج طبيعي',
  'physiotherapy (adults)': 'جلسات علاج طبيعي (كبار)',
  'physiotherapy (children)': 'جلسات علاج طبيعي (أطفال)',
};

const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function getAttendance(s: Session): { attended: number[]; free: number[] } {
  try {
    const d = JSON.parse(s.subscriptionAttendance || '{}');
    if (Array.isArray(d)) return { attended: d, free: [] };
    return { attended: d.a || [], free: d.f || [] };
  } catch { return { attended: [], free: [] }; }
}

export default function SubscribersPage() {
  const { t } = useLanguage();
  const [subscribers, setSubscribers] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subscription_amount: '', subscription_day: '', attendance: [] as number[], freeDays: [] as number[] });
  const [renewForm, setRenewForm] = useState({ subscription_amount: '', subscription_day: '' });
  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

  const fetch = useCallback(() => {
    api.get('/sessions').then(({ data }) => {
      setSubscribers((data as Session[]).filter(s => s.subscriptionPeriod && s.subscriptionAmount));
    }).catch(() => {});
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = subscribers.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.fullname.toLowerCase().includes(q)
      || s.sessionType.toLowerCase().includes(q)
      || (s.speacial && s.speacial.toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const openEdit = (s: Session) => {
    setSelectedId(s.id);
    const data = getAttendance(s);
    setEditForm({
      subscription_amount: s.subscriptionAmount?.toString() || '',
      subscription_day: s.subscriptionDay?.toString() || '',
      attendance: data.attended,
      freeDays: data.free,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      await api.put(`/sessions/${selectedId}`, {
        subscription_attendance: JSON.stringify({ a: editForm.attendance, f: editForm.freeDays }),
      });
      setEditOpen(false);
      fetch();
    } catch { /* ignore */ }
  };

  const openDelete = (id: string) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/sessions/${selectedId}`);
      setDeleteOpen(false);
      fetch();
    } catch { /* ignore */ }
  };

  const openRenew = (s: Session) => {
    setSelectedId(s.id);
    setRenewForm({ subscription_amount: s.subscriptionAmount?.toString() || '', subscription_day: s.subscriptionDay?.toString() || '' });
    setRenewOpen(true);
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      await api.put(`/sessions/${selectedId}`, {
        subscription_amount: renewForm.subscription_amount ? Number(renewForm.subscription_amount) : null,
        subscription_day: renewForm.subscription_day ? Number(renewForm.subscription_day) : null,
        subscription_attendance: '{"a":[],"f":[]}',
      });
      setRenewOpen(false);
      fetch();
    } catch { /* ignore */ }
  };

  const openInstallments = (s: Session) => {
    setSelectedId(s.id);
    setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
    setInstallmentOpen(true);
  };

  const handleAddPayment = async () => {
    if (!selectedId || !installmentForm.amount) return;
    const s = subscribers.find(x => x.id === selectedId);
    if (!s) return;
    const payments = getInstallments(s);
    payments.push({ amount: Number(installmentForm.amount), date: installmentForm.date });
    try {
      await api.put(`/sessions/${selectedId}`, {
        installments: JSON.stringify({ payments }),
      });
      setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
      fetch();
    } catch { /* ignore */ }
  };

  const handleDeletePayment = async (idx: number) => {
    if (!selectedId) return;
    const s = subscribers.find(x => x.id === selectedId);
    if (!s) return;
    const payments = getInstallments(s);
    payments.splice(idx, 1);
    try {
      await api.put(`/sessions/${selectedId}`, {
        installments: JSON.stringify({ payments }),
      });
      fetch();
    } catch { /* ignore */ }
  };

  const handleDownload = (s: Session) => {
    const today = new Date();
    const { attended, free: freeDays } = getAttendance(s);

    const startDate = s.sessionDate ? new Date(s.sessionDate) : today;
    const totalDays = s.subscriptionPeriod === 'يوم' && s.subscriptionDay ? s.subscriptionDay : (s.subscriptionPeriod === 'شهر' ? 30 : s.subscriptionPeriod === 'أسبوع' ? 7 : 1);
    const perDay = Math.floor((s.subscriptionAmount ?? 0) / totalDays);

    let rows = '';
    let counter = 0;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      counter++;
      const dateStr = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
      const dayName = dayNames[d.getDay()];
      const isSigned = attended.includes(i);
      const isFree = freeDays.includes(i);
      rows += `<tr>
        <td>${counter}</td>
        <td>${dateStr}</td>
        <td>${dayName}</td>
        <td>${typeLabels[s.sessionType] || s.sessionType}</td>
        <td>${isSigned ? '✓' : ''}</td>
        <td></td>
      </tr>`;
    }

    const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<title>كشف اشتراك - ${s.fullname}</title>
<style>
*{ box-sizing:border-box; font-family:Tahoma, Arial, sans-serif; }
body{ margin:10px; }
.sheet{ width:210mm; margin:auto; background:#fff; padding:5mm; border:1px solid #000; }
table{ width:100%; border-collapse:collapse; }
th,td{ border:1px solid #000; padding:2px 3px; text-align:center; vertical-align:middle; font-size:11px; height:26px; }
thead th{ background:#f7f7f7; font-weight:bold; }
.title{ font-size:16px; font-weight:bold; border:1px solid #000; padding:5px; }
.patient{ text-align:right; padding-right:8px; font-weight:bold; font-size:12px; }
.amount{ color:#0b8d2b; font-weight:bold; }
.free{ color:#d30000; font-weight:bold; }
.signature{ width:90px; }
.notes{ width:130px; }
.no{ width:30px; }
.date{ width:85px; }
.day{ width:70px; }
.service{ width:140px; }
@media print{ body{ margin:0; } .sheet{ border:none; width:100%; padding:0; } }
</style>
</head>
<body>
<div class="sheet" dir="rtl">
<table>
<tr><td colspan="6" class="title">كشف التوقيع اليومي للمرضى</td></tr>
<tr>
  <td colspan="5" class="patient">اسم الحالة : ${s.fullname}</td>
  <td class="amount">${s.subscriptionAmount?.toLocaleString()} ريال</td>
</tr>
</table>
<br>
<table>
<thead>
<tr>
  <th class="no">م</th>
  <th class="date">التاريخ</th>
  <th class="day">اليوم</th>
  <th class="service">نوع الخدمة</th>
  <th class="signature">التوقيع</th>
  <th class="notes">ملاحظات</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</body>
</html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const selectedSub = subscribers.find(s => s.id === selectedId);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{t('subscribers.title')}</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="بحث..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} sx={{ maxWidth: 320 }} />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'action.hover' } }}>
              <TableCell>اسم المريض</TableCell>
              <TableCell>نوع الجلسة</TableCell>
              <TableCell>المعالج</TableCell>
              <TableCell>المبلغ الإجمالي</TableCell>
              <TableCell>المدفوع</TableCell>
              <TableCell>المتبقي</TableCell>
              <TableCell>اليوم</TableCell>
              <TableCell>التوقيع</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(s => {
              const { attended: attList, free: freeList } = getAttendance(s);
              const paid = getPaid(s);
              const remaining = getRemaining(s);
              const isFullyPaid = remaining <= 0;
              return (
              <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{s.fullname}</TableCell>
                <TableCell>{typeLabels[s.sessionType] || s.sessionType}</TableCell>
                <TableCell>{s.speacial || '-'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{s.subscriptionAmount?.toLocaleString()} YER</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>{paid.toLocaleString()} YER</TableCell>
                <TableCell sx={{ fontWeight: 600, color: remaining > 0 ? 'error.main' : 'text.disabled' }}>{remaining > 0 ? `${remaining.toLocaleString()} YER` : '—'}</TableCell>
                <TableCell>{Math.max(0, (s.subscriptionDay ?? 0) - attList.length)}</TableCell>
                <TableCell>
                  <Chip label={attList.length > 0 ? `✓ (${attList.length})` : '—'} size="small" color={attList.length > 0 ? 'success' : 'default'} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => openEdit(s)} sx={{ bgcolor: '#007bff15', color: '#007bff', '&:hover': { bgcolor: '#007bff25' } }}>
                      <Edit sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => openInstallments(s)} sx={{ bgcolor: '#28a74515', color: '#28a745', '&:hover': { bgcolor: '#28a74525' } }}>
                      <AccountBalanceWallet sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDownload(s)} sx={{ bgcolor: '#17a2b815', color: '#17a2b8', '&:hover': { bgcolor: '#17a2b825' } }}>
                      <Download sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => openRenew(s)} sx={{ bgcolor: '#6f42c115', color: '#6f42c1', '&:hover': { bgcolor: '#6f42c125' } }}>
                      <Autorenew sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => openDelete(s.id)} sx={{ bgcolor: '#dc354515', color: '#dc3545', '&:hover': { bgcolor: '#dc354525' } }}>
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  {searchQuery ? `لا توجد نتائج — "${searchQuery}"` : t('subscribers.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, v) => setPage(v - 1)} color="primary" size="small" />
        </Box>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}></DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.secondary' }}>الأيام (انقر: حضور | انقر مرتين: مجاني)</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(() => {
                  const editing = subscribers.find(s => s.id === selectedId);
                  if (!editing) return null;
                  const startDate = editing.sessionDate ? new Date(editing.sessionDate) : new Date();
                  const totalDays = editing.subscriptionPeriod === 'يوم' && editing.subscriptionDay ? editing.subscriptionDay : (editing.subscriptionPeriod === 'شهر' ? 30 : editing.subscriptionPeriod === 'أسبوع' ? 7 : 1);
                  return Array.from({ length: totalDays }, (_, i) => {
                    const d = new Date(startDate);
                    d.setDate(d.getDate() + i);
                    const isAttended = editForm.attendance.includes(i);
                    const isFree = editForm.freeDays.includes(i);
                    return (
                      <Tooltip key={i} title={`${d.getDate()} ${monthNames[d.getMonth()]} - ${dayNames[d.getDay()]}${isFree ? ' (مجاني)' : ''}`}>
                        <Chip
                          label={`${d.getDate()}/${d.getMonth() + 1}`}
                          size="small"
                          color={isFree ? 'warning' : isAttended ? 'success' : 'default'}
                          variant={isAttended || isFree ? 'filled' : 'outlined'}
                          onClick={() => {
                            if (isFree) {
                              setEditForm(f => ({ ...f, freeDays: f.freeDays.filter(d => d !== i) }));
                            } else if (isAttended) {
                              setEditForm(f => ({ ...f, attendance: f.attendance.filter(d => d !== i), freeDays: [...f.freeDays, i] }));
                            } else {
                              setEditForm(f => ({ ...f, attendance: [...f.attendance, i] }));
                            }
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      </Tooltip>
                    );
                  });
                })()}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(false)} color="secondary">إلغاء</Button>
            <Button type="submit" variant="contained" color="primary">حفظ</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>حذف الاشتراك</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف هذا الاشتراك؟</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="secondary">إلغاء</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">حذف</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renewOpen} onClose={() => setRenewOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleRenewSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>تجديد الاشتراك</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField fullWidth label="مبلغ الاشتراك الجديد" type="number" value={renewForm.subscription_amount} onChange={e => setRenewForm(f => ({ ...f, subscription_amount: e.target.value }))} />
              <TextField fullWidth label="عدد الأيام" type="number" value={renewForm.subscription_day} onChange={e => setRenewForm(f => ({ ...f, subscription_day: e.target.value }))} slotProps={{ htmlInput: { min: 1 } }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRenewOpen(false)} color="secondary">إلغاء</Button>
            <Button type="submit" variant="contained" color="primary">تجديد</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={installmentOpen} onClose={() => setInstallmentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>نظام الأقساط</DialogTitle>
        <DialogContent>
          {selectedSub && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`الإجمالي: ${selectedSub.subscriptionAmount?.toLocaleString()} YER`} color="primary" variant="outlined" />
                <Chip label={`المدفوع: ${getPaid(selectedSub).toLocaleString()} YER`} color="success" variant="filled" />
                <Chip label={`المتبقي: ${getRemaining(selectedSub).toLocaleString()} YER`} color={getRemaining(selectedSub) > 0 ? 'error' : 'default'} variant="filled" />
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.secondary', mt: 2 }}>سجل الدفعات</Typography>
              {getInstallments(selectedSub).length === 0 && (
                <Typography variant="body2" color="text.disabled">لا توجد دفعات مسجلة</Typography>
              )}
              {getInstallments(selectedSub).map((p, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f5f5f5', borderRadius: 1, px: 2, py: 1 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{p.amount.toLocaleString()} YER</Typography>
                    <Typography variant="caption" color="text.secondary">{p.date}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleDeletePayment(i)} sx={{ color: '#dc3545' }}>
                    <Delete sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              ))}

              <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.secondary', mt: 1 }}>إضافة دفعة جديدة</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField size="small" label="المبلغ" type="number" value={installmentForm.amount} onChange={e => setInstallmentForm(f => ({ ...f, amount: e.target.value }))} sx={{ width: 150 }} />
                <TextField size="small" label="التاريخ" type="date" value={installmentForm.date} onChange={e => setInstallmentForm(f => ({ ...f, date: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
                <Button variant="contained" size="small" onClick={handleAddPayment} sx={{ mt: 0.5, whiteSpace: 'nowrap', minWidth: 80, height: 40 }}>إضافة</Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInstallmentOpen(false)} color="secondary">إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
