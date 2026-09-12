import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell, Chip, Avatar, CircularProgress } from '@mui/material';
import { People, Paid, Receipt, TrendingDown, AccountBalanceWallet, ReceiptLong, Savings } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

const periodLabel: Record<string, string> = {
  daily: 'nav.dailyReport',
  weekly: 'nav.weeklyReport',
  monthly: 'nav.monthlyReport',
};

const colors = ['#3e5679', '#2e7d32', '#7c4dff', '#e65100', '#00838f', '#558b2f', '#c62828', '#6a1b9a'];
const RADIAN = Math.PI / 180;

const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#333" fontSize={12} fontWeight={600}
      textAnchor={x > cx ? 'start' : x < cx ? 'end' : 'middle'} dominantBaseline="central">
      {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ReportsPage({ period, date }: { period: string; date?: string }) {
  const { t, locale } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const load = () => {
      api.get('/dashboard/stats', { params: { locale, period } }).then(r => setData(r.data)).catch(() => {});
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [locale, period]);

  useEffect(() => {
    const load = () => {
      if (period === 'daily') {
        api.get('/dashboard/daily-summary', { params: { date } }).then(r => setSummary(r.data)).catch(() => {});
      } else if (period === 'weekly') {
        api.get('/dashboard/weekly-summary', { params: { weekStart: date } }).then(r => setSummary(r.data)).catch(() => {});
      } else if (period === 'monthly') {
        api.get('/dashboard/monthly-summary').then(r => setSummary(r.data)).catch(() => {});
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [period, locale, date]);

  if (!data) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><CircularProgress /></Box>;
  }

  const recentPatients = data.recentPatients || [];
  const recentAppts = data.recentAppointments || [];

  const dailyCards = summary ? [
    { label: t('dashboard.dailyIncome'), value: summary.incomeTotal, color: '#059669', icon: <Paid /> },
    { label: t('dashboard.dailyExpenses'), value: summary.sumExpenses, color: '#dc2626', icon: <TrendingDown /> },
    { label: t('dashboard.dailyAdvances'), value: summary.sumAdvances, color: '#7c3aed', icon: <AccountBalanceWallet /> },
    { label: t('dashboard.dailyInvoices'), value: summary.sumInvoices, color: '#ea580c', icon: <ReceiptLong /> },
    { label: t(period === 'daily' ? 'dashboard.dailyNet' : period === 'weekly' ? 'dashboard.weeklyNet' : 'dashboard.monthlyNet'), value: summary.netTotal, color: '#3e5679', icon: <Savings /> },
  ] : [];

  const showSummaryCards = summary && (period === 'daily' || period === 'weekly' || period === 'monthly');

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>{t(periodLabel[period] || periodLabel.monthly)}</Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card><CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: '#3e567915', color: '#3e5679', mx: 'auto', mb: 1 }}><Paid /></Avatar>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>YER {data.revenueOverview.revenue.toLocaleString()}</Typography>
            <Typography variant="body2" color="text.secondary">{t('dashboard.earnings')}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card><CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: '#2e7d3215', color: '#2e7d32', mx: 'auto', mb: 1 }}><Receipt /></Avatar>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{data.revenueOverview.sessions}</Typography>
            <Typography variant="body2" color="text.secondary">{t('dashboard.totalSessions')}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card><CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: '#7c4dff15', color: '#7c4dff', mx: 'auto', mb: 1 }}><People /></Avatar>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{data.revenueOverview.patients}</Typography>
            <Typography variant="body2" color="text.secondary">{t('dashboard.statTotalPatients')}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('dashboard.revenue')}</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.periodChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={period === 'daily' ? 2 : 0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3e5679" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('dashboard.sessionTypes')}</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.sessionTypes} cx="50%" cy="50%" outerRadius={90} dataKey="value" labelLine label={renderPieLabel}>
                    {data.sessionTypes.map((e: any, i: number) => <Cell key={e.name} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {showSummaryCards && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {dailyCards.map((c, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Card><CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: `${c.color}15`, color: c.color, mx: 'auto', mb: 1 }}>{c.icon}</Avatar>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>YER {c.value.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">{c.label}</Typography>
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={3}>
        {period !== 'daily' && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('dashboard.recentAppointments')}</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{t('appointments.col.patient')}</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{t('appointments.col.therapist')}</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{t('appointments.col.date')}</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{t('appointments.col.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAppts.map((a: any, i: number) => (
                        <tr key={a.id} style={{ borderBottom: i < recentAppts.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.patient}</td>
                          <td style={{ padding: '10px 12px' }}>{a.therapist || '—'}</td>
                          <td style={{ padding: '10px 12px' }}>{a.date || '—'}</td>
                          <td style={{ padding: '10px 12px' }}><Chip label={a.status || '—'} size="small" color={a.status === 'paid' ? 'success' : a.status === 'cancelled' ? 'error' : 'warning'} sx={{ height: 22, fontSize: 11 }} /></td>
                        </tr>
                      ))}
                      {recentAppts.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: 'text.secondary' }}>{t('dashboard.noAppointments')}</td></tr>}
                    </tbody>
                  </table>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid size={{ xs: 12, md: period === 'daily' ? 12 : 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('dashboard.recentPatients')}</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{t('patients.add.form.name')}</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{t('patients.add.form.phone')}</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{t('patients.add.form.gender')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map((p: any, i: number) => (
                      <tr key={p.id} style={{ borderBottom: i < recentPatients.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '10px 12px' }}>{p.phone}</td>
                        <td style={{ padding: '10px 12px' }}><Chip label={p.gender} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} /></td>
                      </tr>
                    ))}
                    {recentPatients.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: 'text.secondary' }}>{t('dashboard.noPatients')}</td></tr>}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
