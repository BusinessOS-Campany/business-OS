import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, Button, Avatar, List, ListItem, ListItemText,
  ListItemAvatar, Chip, CircularProgress,
} from '@mui/material';
import {
  People, Paid, TrendingUp, TrendingDown, ArrowForward,
  PersonAdd, Man, Woman, Receipt, Assignment,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import TodoWidget from './TodoWidget';

const greetingTime = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

interface DashboardData {
  mainCards: {
    totalPatients: { value: number; trend: string; up: boolean; trendLabel: string };
    dailyIncome: { value: number; trend: string; up: boolean; trendLabel: string };
    weeklyIncome: { value: number; trend: string; up: boolean; trendLabel: string };
    monthlyRevenue: { value: number; trend: string; up: boolean; trendLabel: string };
  };
  patientTileStats: { daily: number; weekly: number; monthly: number; males: number; females: number };
  revenueOverview: { revenue: number; expenses: number; netProfit: number; sessions: number; invoices: number; subscriptionRevenue: number };
  monthlyRevenue: { month: string; revenue: number }[];
  monthlyPatients: { month: string; count: number }[];
  sessionTypes: { name: string; value: number; color: string }[];
  appointmentStatuses: { name: string; value: number; color: string }[];
  recentAppointments: { id: string; patient: string; phone: string | null; therapist: string | null; date: string | null; status: string | null; statusKey: string }[];
  recentPatients: { id: string; name: string; phone: string; gender: string; registrationDate: string | null; createdAt: string }[];
  totals: { totalPatients: number; totalSessions: number; totalAppointments: number; totalTherapists: number };
  growthRates: { patients: string; appointments: string; sessions: string; revenue: string; expenses: string };
}

export default function DashboardPage() {
  const { t, dir, locale } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [revenueTab, setRevenueTab] = useState('ALL');
  useEffect(() => {
    api.get('/dashboard/stats', { params: { locale } }).then(r => setData(r.data)).catch(() => {});
  }, [locale]);

  const statusColor = (k: string) => k === 'dashboard.paid' ? 'success' : k === 'dashboard.cancelled' ? 'error' : 'warning';

  const statCards = data ? [
    { labelKey: 'dashboard.statTotalPatients', value: data.mainCards.totalPatients.value.toLocaleString(), icon: <People />, color: '#3e5679', trend: data.mainCards.totalPatients.trend, up: data.mainCards.totalPatients.up, trendLabel: data.mainCards.totalPatients.trendLabel },
    { labelKey: 'dashboard.statDailyIncome', value: `YER ${data.mainCards.dailyIncome.value.toLocaleString()}`, icon: <Paid />, color: '#2e7d32', trend: data.mainCards.dailyIncome.trend, up: data.mainCards.dailyIncome.up, trendLabel: data.mainCards.dailyIncome.trendLabel },
    { labelKey: 'dashboard.statWeeklyIncome', value: `YER ${data.mainCards.weeklyIncome.value.toLocaleString()}`, icon: <Paid />, color: '#7c4dff', trend: data.mainCards.weeklyIncome.trend, up: data.mainCards.weeklyIncome.up, trendLabel: data.mainCards.weeklyIncome.trendLabel },
    { labelKey: 'dashboard.statMonthlyRevenue', value: `YER ${data.mainCards.monthlyRevenue.value.toLocaleString()}`, icon: <Paid />, color: '#e65100', trend: data.mainCards.monthlyRevenue.trend, up: data.mainCards.monthlyRevenue.up, trendLabel: data.mainCards.monthlyRevenue.trendLabel },
  ] : [];

  const patientTileStats = data ? [
    { labelKey: 'dashboard.stats.dailyPatients', value: data.patientTileStats.daily, icon: <People />, color: '#3e5679' },
    { labelKey: 'dashboard.stats.weeklyPatients', value: data.patientTileStats.weekly, icon: <People />, color: '#2e7d32' },
    { labelKey: 'dashboard.stats.monthlyPatients', value: data.patientTileStats.monthly, icon: <People />, color: '#7c4dff' },
    { labelKey: 'dashboard.stats.totalMales', value: data.patientTileStats.males, icon: <Man />, color: '#00838f' },
    { labelKey: 'dashboard.stats.totalFemales', value: data.patientTileStats.females, icon: <Woman />, color: '#e65100' },
  ] : [];

  const revenueSummary = data ? [
    { label: t('dashboard.earnings'), value: `YER ${data.revenueOverview.revenue.toLocaleString()}`, color: '#2e7d32' },
    { label: t('dashboard.expenses'), value: `YER ${data.revenueOverview.expenses.toLocaleString()}`, color: '#e65100' },
    { label: t('dashboard.netProfit'), value: `YER ${data.revenueOverview.netProfit.toLocaleString()}`, color: '#3e5679' },
    { label: t('dashboard.sessions'), value: data.revenueOverview.sessions.toLocaleString(), color: '#7c4dff' },
    { label: 'اشتراكات', value: `YER ${(data.revenueOverview.subscriptionRevenue || 0).toLocaleString()}`, color: '#f59e0b' },
  ] : [];

  const filteredRevenue = data ? (revenueTab === '1M' ? data.monthlyRevenue.slice(-1) : revenueTab === '6M' ? data.monthlyRevenue.slice(-6) : data.monthlyRevenue) : [];

  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('dashboard.greeting.' + greetingTime())}, {user?.firstName || 'Admin'}!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('dashboard.subtitle')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => navigate('/patients')} sx={{ borderRadius: 2, textTransform: 'none' }}>
          {t('patients.add')}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid key={card.labelKey} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ position: 'relative', overflow: 'hidden', transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>{t(card.labelKey)}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, lineHeight: 1.2 }}>{card.value}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, bgcolor: card.up ? 'success.main' : 'error.main', color: '#fff', borderRadius: 1, px: 0.6, py: 0.15 }}>
                        {card.up ? <TrendingUp sx={{ fontSize: 12 }} /> : <TrendingDown sx={{ fontSize: 12 }} />}
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>{card.trend}</Typography>
                      </Box>
                      {card.trendLabel && <Typography variant="caption" color="text.secondary">{t(card.trendLabel)}</Typography>}
                    </Box>
                  </Box>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: `${card.color}18`, color: card.color }}>
                    {card.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {patientTileStats.map((s) => (
          <Grid key={s.labelKey} size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card sx={{ transition: '0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 } }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5, fontSize: 11 }}>
                  <Box component="span" sx={{ color: s.color }}>{s.icon}</Box>
                  {t(s.labelKey)}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: s.color }}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('dashboard.revenue')}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {['ALL', '1M', '6M'].map(tab => (
                    <Button key={tab} size="small" onClick={() => setRevenueTab(tab)}
                      sx={{ minWidth: 36, px: 1.5, fontWeight: 600, fontSize: 12, borderRadius: 1,
                        bgcolor: revenueTab === tab ? 'primary.main' : 'transparent',
                        color: revenueTab === tab ? '#fff' : 'text.secondary',
                        '&:hover': { bgcolor: revenueTab === tab ? 'primary.dark' : 'action.hover' },
                      }}
                    >{tab}</Button>
                  ))}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                {revenueSummary.map(s => (
                  <Box key={s.label} sx={{ textAlign: 'center', flex: 1, minWidth: 100, p: 1, bgcolor: `${s.color}08`, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: s.color }}>{s.value}</Typography>
                  </Box>
                ))}
              </Box>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={filteredRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3e5679" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('dashboard.patientGrowth')}</Typography>
              </Box>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.monthlyPatients}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3e5679" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('dashboard.statTotalPatients')}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{data.totals.totalPatients}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('dashboard.totalSessions')}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{data.totals.totalSessions}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('dashboard.sessionTypes')}</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.sessionTypes} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {data.sessionTypes.map(e => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('dashboard.appointmentStatus')}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, justifyContent: 'center', height: 200 }}>
                {data.appointmentStatuses.map(s => (
                  <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500 }}>{s.name}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.value}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('dashboard.recentPatients')}</Typography>
              <List dense>
                {data.recentPatients.map((p, i) => (
                  <ListItem key={p.id} divider={i < data.recentPatients.length - 1} sx={{ px: 0, gap: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#3e567915', color: '#3e5679', fontSize: 12 }}>
                        {p.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={p.name}
                      secondary={p.phone}
                      slotProps={{ primary: { sx: { fontWeight: 600 }, variant: 'body2' }, secondary: { variant: 'caption' } }}
                    />
                    <Chip label={p.gender} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  </ListItem>
                ))}
                {data.recentPatients.length === 0 && (
                  <ListItem sx={{ px: 0 }}><ListItemText primary={t('dashboard.noPatients')} /></ListItem>
                )}
              </List>
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/patients')} sx={{ textTransform: 'none', fontSize: 12, mt: 1 }}>
                {t('dashboard.viewAll')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('dashboard.recentAppointments')}</Typography>
                <Button size="small" onClick={() => navigate('/appointments')} sx={{ textTransform: 'none', fontSize: 12 }}>{t('dashboard.viewAll')}</Button>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      {[t('appointments.col.id'), t('appointments.col.patient'), t('appointments.col.therapist'), t('appointments.col.date'), t('appointments.col.status')].map(h => (
                        <th key={h} style={{ textAlign: dir === 'rtl' ? 'right' : 'left', padding: '8px 12px', fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentAppointments.map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: i < data.recentAppointments.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{a.id.slice(0, 8)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: '#3e567915', color: '#3e5679' }}>{a.patient.charAt(0)}</Avatar>
                            {a.patient}
                          </Box>
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{a.therapist || '—'}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{a.date || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Chip label={a.status || '—'} size="small" color={statusColor(a.statusKey)} sx={{ height: 22, fontSize: 11 }} />
                        </td>
                      </tr>
                    ))}
                    {data.recentAppointments.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'text.secondary' }}>{t('dashboard.noAppointments')}</td></tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TodoWidget />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('dashboard.sessionTypes')}</Typography>
              <List dense>
                {data.sessionTypes.map((s, i) => (
                  <ListItem key={s.name} divider={i < data.sessionTypes.length - 1} sx={{ px: 0 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.color, flexShrink: 0, mr: 1.5 }} />
                    <ListItemText
                      primary={s.name}
                      slotProps={{ primary: { sx: { fontWeight: 500 }, variant: 'body2' } }}
                    />
                    <Chip label={s.value} size="small" sx={{ bgcolor: `${s.color}15`, color: s.color, fontWeight: 600, fontSize: 11 }} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: '#3e567915', color: '#3e5679', mx: 'auto', mb: 1.5 }}>
                <Receipt />
              </Avatar>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{data.totals.totalSessions}</Typography>
              <Typography variant="body2" color="text.secondary">{t('dashboard.totalSessions')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: '#e6510015', color: '#e65100', mx: 'auto', mb: 1.5 }}>
                <Assignment />
              </Avatar>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{data.totals.totalAppointments}</Typography>
              <Typography variant="body2" color="text.secondary">{t('dashboard.monthlyAppointments')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
