import { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, TextField, Typography, Grid, Card, CardContent, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack,
  MenuItem, CircularProgress,
} from '@mui/material';
import { Print, DownloadForOffline, GridOn, Payments, AccountBalanceWallet, Receipt, Savings, TrendingDown, Paid, Search, RestartAlt } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';
import { downloadReportPdf } from './reportPdf';

const pad = (n: number) => String(n).padStart(2, '0');
const todayInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

interface DayRow {
  date: string;
  dayNumber: number;
  dayName: string;
  income: number;
  advances: number;
  expenses: number;
  net: number;
  notes: string;
}

interface WeekGroup {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: DayRow[];
  totals: { income: number; advances: number; expenses: number; net: number };
}

interface FinancialData {
  from: string;
  to: string;
  days: DayRow[];
  weeks: WeekGroup[];
  totals: { income: number; advances: number; expenses: number; net: number };
  salaries: number;
  obligations: number;
  debtPayment: number;
  financialStatus: number;
}

const WEEK_RANGES: [number, number][] = [[1, 7], [8, 14], [15, 21], [22, 28], [29, 31]];

export default function FinancialSummaryPage() {
  const { t, locale } = useLanguage();
  const token = localStorage.getItem('accessToken');

  const [fromDate, setFromDate] = useState(() => `${monthInput(new Date())}-01`);
  const [toDate, setToDate] = useState(() => todayInput(new Date()));
  const [week, setWeek] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    api.get('/dashboard/financial-summary', { params: { from: fromDate, to: toDate } })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  const applyQuickFilters = () => {
    const now = new Date();
    const monthVal = month || monthInput(now);
    const yearVal = year || monthVal.slice(0, 4);
    if (week) {
      const lastDay = new Date(Number(yearVal), Number(monthVal.slice(5, 7)), 0).getDate();
      const [s, e] = WEEK_RANGES[Number(week) - 1] || [1, lastDay];
      setFromDate(`${monthVal}-${pad(s)}`);
      setToDate(`${monthVal}-${pad(Math.min(e, lastDay))}`);
    } else if (month) {
      const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
      setFromDate(`${month}-01`);
      setToDate(`${month}-${pad(lastDay)}`);
    } else if (year) {
      setFromDate(`${year}-01-01`);
      setToDate(`${year}-12-31`);
    } else {
      setFromDate(`${monthVal}-01`);
      setToDate(todayInput(now));
    }
  };

  const resetFilters = () => {
    setWeek('');
    setMonth('');
    setYear('');
    const now = new Date();
    setFromDate(`${monthInput(now)}-01`);
    setToDate(todayInput(now));
  };

  const printUrl = `${api.defaults.baseURL}/dashboard/financial-summary-report?token=${token}&from=${fromDate}&to=${toDate}`;
  const fileNameBase = `financial-summary-${fromDate}-${toDate}`;

  const downloadPdf = () => downloadReportPdf(`${printUrl}&autoprint=0`, `${fileNameBase}.pdf`);

  const downloadExcel = async () => {
    try {
      const { data: blob } = await api.get('/dashboard/financial-summary-excel', { params: { from: fromDate, to: toDate, lang: locale }, responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileNameBase}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: t('financial.cardIncome'), value: data.totals.income, color: '#059669', icon: <Paid /> },
      { label: t('financial.cardAdvances'), value: data.totals.advances, color: '#e11d48', icon: <AccountBalanceWallet /> },
      { label: t('financial.cardExpenses'), value: data.totals.expenses, color: '#dc2626', icon: <TrendingDown /> },
      { label: t('financial.cardNet'), value: data.totals.net, color: '#7c4dff', icon: <Savings /> },
      { label: t('financial.cardSalaries'), value: data.salaries, color: '#b45309', icon: <Payments /> },
      { label: t('financial.cardStatus'), value: data.financialStatus, color: '#3e5679', icon: <Receipt /> },
    ];
  }, [data, t]);

  const fmt = (n: number) => n.toLocaleString('en-US');

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur, cur - 1, cur - 2, cur - 3];
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{t('financial.title')}</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField type="date" label={t('financial.from')} size="small" value={fromDate} onChange={e => setFromDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" label={t('financial.to')} size="small" value={toDate} onChange={e => setToDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select label={t('financial.week')} size="small" value={week} onChange={e => setWeek(e.target.value)} sx={{ minWidth: 110 }}>
              <MenuItem value="">—</MenuItem>
              {[1, 2, 3, 4, 5].map(w => <MenuItem key={w} value={String(w)}>{t('financial.week')} {w}</MenuItem>)}
            </TextField>
            <TextField type="month" label={t('financial.month')} size="small" value={month} onChange={e => setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select label={t('financial.year')} size="small" value={year} onChange={e => setYear(e.target.value)} sx={{ minWidth: 110 }}>
              <MenuItem value="">—</MenuItem>
              {years.map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
            </TextField>
            <Button variant="contained" startIcon={<Search />} onClick={applyQuickFilters}>{t('financial.search')}</Button>
            <Button variant="outlined" startIcon={<RestartAlt />} onClick={resetFilters}>{t('financial.reset')}</Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<Print />} onClick={() => window.open(printUrl, '_blank')}>
          {t('common.print')}
        </Button>
        <Button variant="contained" color="success" startIcon={<DownloadForOffline />} onClick={downloadPdf}>
          {t('common.downloadPdf')}
        </Button>
        <Button variant="contained" color="info" startIcon={<GridOn />} onClick={downloadExcel}>
          {t('common.downloadExcel')}
        </Button>
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}

      {!loading && data && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {cards.map((c, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Card><CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: `${c.color}15`, color: c.color, mx: 'auto', mb: 1 }}>{c.icon}</Avatar>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>YER {fmt(c.value)}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {t('financial.title')} <Typography component="span" variant="body2" color="text.secondary">({data.from} — {data.to})</Typography>
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
                <Table dir="rtl" size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.col.date')}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.col.day')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#059669' }}>{t('financial.col.income')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#e11d48' }}>{t('financial.col.outgoing')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#dc2626' }}>{t('financial.col.expenses')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{t('financial.col.net')}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.col.notes')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.days.length === 0 && (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>—</TableCell></TableRow>
                    )}
                    {data.weeks.map(w => w.days.map((d, di) => (
                      <TableRow key={`${w.weekNumber}-${di}`} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, color: '#1e40af' }}>{d.dayNumber}</Typography>
                          <Typography variant="caption" color="text.secondary" dir="ltr">{d.date}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{d.dayName}</TableCell>
                        <TableCell align="center" sx={{ color: '#059669', fontWeight: 700 }}>{fmt(d.income)}</TableCell>
                        <TableCell align="center" sx={{ color: '#e11d48', fontWeight: 700 }}>{d.advances ? `-${fmt(d.advances)}` : '-'}</TableCell>
                        <TableCell align="center" sx={{ color: '#dc2626', fontWeight: 700 }}>{d.expenses ? `-${fmt(d.expenses)}` : '-'}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>{fmt(d.net)}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 260 }}>{d.notes}</TableCell>
                      </TableRow>
                    )))}
                    {data.weeks.map((w, wi) => (
                      <TableRow key={`weektotal-${wi}`} sx={{ bgcolor: '#f5f3ff' }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 800, color: '#5b21b6' }}>
                          {t('financial.weekTotal')} {w.weekNumber} ({w.startDate} — {w.endDate})
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#059669' }}>{fmt(w.totals.income)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#e11d48' }}>{w.totals.advances ? `-${fmt(w.totals.advances)}` : '-'}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#dc2626' }}>{w.totals.expenses ? `-${fmt(w.totals.expenses)}` : '-'}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#7c3aed' }}>{fmt(w.totals.net)}</TableCell>
                        <TableCell />
                      </TableRow>
                    ))}
                    {data.days.length > 0 && (
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 900 }}>{t('financial.grandTotal')}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: '#059669' }}>{fmt(data.totals.income)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: '#e11d48' }}>{data.totals.advances ? `-${fmt(data.totals.advances)}` : '-'}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: '#dc2626' }}>{data.totals.expenses ? `-${fmt(data.totals.expenses)}` : '-'}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{fmt(data.totals.net)}</TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('financial.summaryTitle')}</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table dir="rtl" size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.sumIncome')}</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: '#059669' }}>{fmt(data.totals.income)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.sumAdvances')}</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: '#e11d48' }}>-{fmt(data.totals.advances)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.sumExpenses')}</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: '#dc2626' }}>-{fmt(data.totals.expenses)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.sumNet')}</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: '#7c3aed' }}>{fmt(data.totals.net)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.sumSalaries')}</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: '#b45309' }}>-{fmt(data.salaries)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.sumObligations')}</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: '#b45309' }}>{data.obligations ? `-${fmt(data.obligations)}` : '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t('financial.sumDebt')}</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: '#b45309' }}>{data.debtPayment ? `-${fmt(data.debtPayment)}` : '-'}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#f5f3ff' }}>
                      <TableCell sx={{ fontWeight: 900, color: '#5b21b6', fontSize: 15 }}>{t('financial.sumStatus')}</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 900, color: '#7c3aed', fontSize: 18 }}>{fmt(data.financialStatus)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
