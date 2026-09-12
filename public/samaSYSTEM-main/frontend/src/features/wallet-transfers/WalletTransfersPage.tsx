import { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Paper, TablePagination, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, Stack,
} from '@mui/material';
import { AccountBalanceWallet, Edit, Delete } from '@mui/icons-material';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const WALLET_TYPES = [
  'جوالي', 'WeCash', 'جيب', 'AHD Financial',
  'موبايل موني', 'كاك بنك',
  'فلوسك', 'بنك الكريمي للتمويل الأصغر الإسلامي',
  'ONE Cash', 'كاش', 'Tamkeen Financial',
  'شامل موني', 'بنك شامل',
  'سبأ كاش', 'محفظتي', 'أم فلوس',
];

interface WalletItem {
  id: string;
  fullname: string;
  price: number | null;
  date: string | null;
  walletType: string | null;
  transactionNumber: string | null;
  paymentMethod: string | null;
  installments: string | null;
  source: 'session' | 'patient';
  examType?: string;
}

interface Payment {
  amount: number;
  date: string;
}

function getInstallmentPayments(s: WalletItem): Payment[] {
  try {
    const d = JSON.parse(s.installments || '{}');
    if (Array.isArray(d)) return d;
    return d.payments || [];
  } catch { return []; }
}

function getInstallmentPaid(s: WalletItem): number {
  return getInstallmentPayments(s).reduce((sum, p) => sum + p.amount, 0);
}

function getInstallmentRemaining(s: WalletItem): number {
  return (s.price || 0) - getInstallmentPaid(s);
}

export default function WalletTransfersPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<WalletItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [selected, setSelected] = useState<WalletItem | null>(null);
  const [editForm, setEditForm] = useState({ price: '', wallet_type: '', transaction_number: '' });
  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

  const fetchAll = async () => {
    try {
      const [sessRes, patRes] = await Promise.all([
        api.get('/sessions'),
        api.get('/patients'),
      ]);
      const sessions: WalletItem[] = (sessRes.data as any[]).filter((s: any) => s.paymentMethod === 'محفظة').map(s => ({
        id: s.id,
        fullname: s.fullname,
        price: s.price,
        date: s.sessionDate,
        walletType: s.walletType,
        transactionNumber: s.transactionNumber,
        paymentMethod: s.paymentMethod,
        installments: s.installments,
        source: 'session' as const,
      }));
      const patients: WalletItem[] = (patRes.data as any[]).filter((p: any) => p.paymentMethod === 'محفظة').map(p => ({
        id: p.id,
        fullname: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
        price: p.price,
        date: p.registrationDate,
        walletType: p.walletType,
        transactionNumber: p.transactionNumber,
        paymentMethod: p.paymentMethod,
        installments: p.installments,
        source: 'patient' as const,
        examType: p.examType || '',
      }));
      setItems([...sessions, ...patients]);
    } catch (err) {
      console.error('Failed to fetch wallet transfers:', err);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    let list = items.filter(s => s.paymentMethod === 'محفظة');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.fullname.toLowerCase().includes(q) ||
        (s.walletType || '').toLowerCase().includes(q) ||
        (s.transactionNumber || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [items, search]);

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const apiPath = (item: WalletItem) => item.source === 'session' ? '/sessions' : '/patients';

  const openEdit = (s: WalletItem) => {
    setSelected(s);
    setEditForm({
      price: s.price?.toString() || '',
      wallet_type: s.walletType || '',
      transaction_number: s.transactionNumber || '',
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selected) return;
    try {
      const payload: any = {
        price: editForm.price ? parseFloat(editForm.price) : null,
        wallet_type: editForm.wallet_type,
        transaction_number: editForm.transaction_number,
      };
      if (selected.source === 'patient') {
        payload.fullName = selected.fullname;
        payload.examType = selected.examType || 'physiotherapy';
      }
      await api.put(`${apiPath(selected)}/${selected.id}`, payload);
      setEditOpen(false);
      fetchAll();
    } catch (err) {
      console.error('Failed to update wallet transfer:', err);
    }
  };

  const openDelete = (s: WalletItem) => {
    setSelected(s);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`${apiPath(selected)}/${selected.id}`);
      setDeleteOpen(false);
      fetchAll();
    } catch { /* ignore */ }
  };

  const openInstallments = (s: WalletItem) => {
    setSelected(s);
    setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
    setInstallmentOpen(true);
  };

  const handleAddInstallmentPayment = async () => {
    if (!selected || !installmentForm.amount) return;
    const payments = getInstallmentPayments(selected);
    payments.push({ amount: Number(installmentForm.amount), date: installmentForm.date });
    try {
      await api.put(`${apiPath(selected)}/${selected.id}`, {
        installments: JSON.stringify({ payments }),
      });
      setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
      fetchAll();
    } catch { /* ignore */ }
  };

  const handleDeleteInstallmentPayment = async (idx: number) => {
    if (!selected) return;
    const payments = getInstallmentPayments(selected);
    payments.splice(idx, 1);
    try {
      await api.put(`${apiPath(selected)}/${selected.id}`, {
        installments: JSON.stringify({ payments }),
      });
      fetchAll();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        الحوالات المالية (المحافظ)
      </Typography>

      <Card>
        <CardContent>
          <TextField
            size="small"
            placeholder="بحث باسم المريض أو المحفظة..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            sx={{ mb: 2, maxWidth: 400 }}
          />

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'action.hover' } }}>
                  <TableCell>المريض</TableCell>
                  <TableCell>نوع المحفظة</TableCell>
                  <TableCell>رقم العملية</TableCell>
                  <TableCell>المبلغ</TableCell>
                  <TableCell>الأقساط</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map(s => {
                  const paidAmt = getInstallmentPaid(s);
                  const remainingAmt = getInstallmentRemaining(s);
                  const hasInstallments = s.installments && s.installments !== '';
                  return (
                  <TableRow key={`${s.source}-${s.id}`} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.fullname}</TableCell>
                    <TableCell>
                      <Chip icon={<AccountBalanceWallet />} label={s.walletType || '-'} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell dir="ltr" sx={{ fontFamily: 'monospace' }}>{s.transactionNumber || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>{s.price ?? '-'} ريال</TableCell>
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
                    <TableCell>{s.date ? new Date(s.date).toLocaleDateString('ar-SA') : '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => openInstallments(s)} sx={{ bgcolor: '#28a74515', color: '#28a745', '&:hover': { bgcolor: '#28a74525' } }}>
                          <AccountBalanceWallet sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => openEdit(s)} sx={{ bgcolor: '#007bff15', color: '#007bff', '&:hover': { bgcolor: '#007bff25' } }}>
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => openDelete(s)} sx={{ bgcolor: '#dc354515', color: '#dc3545', '&:hover': { bgcolor: '#dc354525' } }}>
                          <Delete sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );})}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      لا توجد حوالات مالية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filtered.length > rowsPerPage && (
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
              labelRowsPerPage=""
            />
          )}
        </CardContent>
      </Card>

      {/* Installment Dialog */}
      <Dialog open={installmentOpen} onClose={() => setInstallmentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>الأقساط</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`المبلغ: ${selected.price?.toLocaleString()} YER`} color="primary" variant="outlined" />
                <Chip label={`المدفوع: ${getInstallmentPaid(selected).toLocaleString()} YER`} color="success" variant="filled" />
                <Chip label={`المتبقي: ${getInstallmentRemaining(selected).toLocaleString()} YER`} color={getInstallmentRemaining(selected) > 0 ? 'error' : 'default'} variant="filled" />
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.secondary', mt: 1 }}>سجل الدفعات</Typography>
              {getInstallmentPayments(selected).length === 0 && (
                <Typography variant="body2" color="text.disabled">لا توجد دفعات مسجلة</Typography>
              )}
              {getInstallmentPayments(selected).map((p, i) => (
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تعديل الحوالة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="المبلغ" type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} />
            <TextField select fullWidth label="نوع المحفظة" value={editForm.wallet_type} onChange={e => setEditForm(f => ({ ...f, wallet_type: e.target.value }))}>
              <MenuItem value="">اختر</MenuItem>
              {WALLET_TYPES.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="رقم العملية" value={editForm.transaction_number} onChange={e => setEditForm(f => ({ ...f, transaction_number: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} color="secondary">إلغاء</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary">حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>حذف الحوالة</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف هذه الحوالة؟</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="secondary">إلغاء</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
