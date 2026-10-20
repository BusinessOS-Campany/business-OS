import { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, TextField, Typography, Grid, Card, CardContent, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Stack,
} from '@mui/material';
import { Print, DownloadForOffline, GridOn, Payments, AccountBalanceWallet, Receipt, Savings, BarChart } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { downloadReportPdf } from './reportPdf';

const toMonthInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

interface Summary {
  sumSalaries: number;
  sumCoverages: number;
  sumAdvances: number;
}

interface SalaryRow {
  id: string;
  name: string;
  department: string | null;
  salary: number;
  coverages: number;
  advances: number;
  net: number;
}

export default function ReceivablesReportPage() {
  const { t, locale } = useLanguage();
  const token = localStorage.getItem('accessToken');
  const [month, setMonth] = useState(() => toMonthInput(new Date()));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<SalaryRow[]>([]);

  const year = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));

  useEffect(() => {
    api.get('/dashboard/receivables-summary').then(r => setSummary(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/dashboard/receivables-table', { params: { month } }).then(r => setRows(r.data)).catch(() => {});
  }, [month]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    salary: acc.salary + r.salary,
    coverages: acc.coverages + r.coverages,
    advances: acc.advances + r.advances,
    net: acc.net + r.net,
  }), { salary: 0, coverages: 0, advances: 0, net: 0 }), [rows]);

  const printUrl = `${api.defaults.baseURL}/dashboard/receivables-report?token=${token}&month=${month}`;

  const downloadPdf = () => downloadReportPdf(`${printUrl}&autoprint=0`, `receivables-report-${year}-${monthNum}.pdf`);

  const downloadExcel = async () => {
    try {
      const { data: blob } = await api.get('/dashboard/receivables-excel', { params: { month, lang: locale }, responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receivables-report-${year}-${monthNum}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const sumNet = (summary?.sumSalaries ?? 0) + (summary?.sumCoverages ?? 0) - (summary?.sumAdvances ?? 0);

  const cards = summary ? [
    { label: t('receivables.sumSalaries'), value: summary.sumSalaries, color: '#3e5679', icon: <Payments /> },
    { label: t('receivables.sumCoverages'), value: summary.sumCoverages, color: '#2e7d32', icon: <Receipt /> },
    { label: t('receivables.sumAdvances'), value: summary.sumAdvances, color: '#e65100', icon: <AccountBalanceWallet /> },
    { label: t('receivables.sumNet'), value: sumNet, color: '#7c4dff', icon: <Savings /> },
  ] : [];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{t('nav.receivables')}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          size="small"
          slotProps={{ htmlInput: { sx: { fontSize: 14 } } }}
        />
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

      {cards.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {cards.map((c, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Card><CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: `${c.color}15`, color: c.color, mx: 'auto', mb: 1 }}>{c.icon}</Avatar>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>YER {c.value.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">{c.label}</Typography>
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('receivables.table.title')}</Typography>
            <Chip label={`${t('receivables.sumNet')}: ${totals.net.toLocaleString()} YER`} color="secondary" variant="outlined" sx={{ fontWeight: 600 }} />
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table dir="rtl" size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('receivables.table.employee')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('receivables.table.department')}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>{t('receivables.table.salary')}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#2e7d32' }}>{t('receivables.table.coverages')}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#e65100' }}>{t('receivables.table.advances')}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>{t('receivables.table.net')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                    <TableCell>{r.department || '-'}</TableCell>
                    <TableCell align="center">{r.salary.toLocaleString()} YER</TableCell>
                    <TableCell align="center" sx={{ color: '#2e7d32' }}>{r.coverages ? `+${r.coverages.toLocaleString()}` : '-'}</TableCell>
                    <TableCell align="center" sx={{ color: '#e65100' }}>{r.advances ? `-${r.advances.toLocaleString()}` : '-'}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>{r.net.toLocaleString()} YER</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>{t('common.total')}</TableCell>
                  <TableCell />
                  <TableCell align="center" sx={{ fontWeight: 800 }}>{totals.salary.toLocaleString()}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#2e7d32' }}>+{totals.coverages.toLocaleString()}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#e65100' }}>-{totals.advances.toLocaleString()}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>{totals.net.toLocaleString()} YER</TableCell>
                </TableRow>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">{t('receivables.table.empty')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent
          component={Link}
          to="/reports/financial-summary"
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
            textDecoration: 'none', cursor: 'pointer', p: 3,
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)',
            color: '#fff',
            '&:hover': { boxShadow: 6 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 52, height: 52, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <BarChart />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('receivables.goFinancialSummary')}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>{t('receivables.goFinancialSummaryDesc')}</Typography>
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 900, fontSize: 28 }}>←</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
