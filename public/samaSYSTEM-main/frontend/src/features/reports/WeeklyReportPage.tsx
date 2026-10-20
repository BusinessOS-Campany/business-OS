import { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { Print, DownloadForOffline } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';
import ReportsPage from './ReportsPage';
import { downloadReportPdf } from './reportPdf';

const toWeekInput = (d: Date) => {
  const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const toDateInput = (d: Date) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const mondayOfWeek = (year: number, week: number) => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNum = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4.getTime() - (dayNum - 1) * 86400000);
  return new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000);
};

export default function WeeklyReportPage() {
  const { t } = useLanguage();
  const token = localStorage.getItem('accessToken');
  const [weekValue, setWeekValue] = useState(() => toWeekInput(new Date()));

  const match = weekValue.match(/^(\d{4})-W(\d{1,2})$/);
  const weekStart = match ? toDateInput(mondayOfWeek(Number(match[1]), Number(match[2]))) : '';

  const printUrl = `${api.defaults.baseURL}/dashboard/weekly-report?token=${token}&weekStart=${weekStart}`;

  const downloadPdf = () => downloadReportPdf(`${printUrl}&autoprint=0`, `weekly-report-${weekStart}.pdf`);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          type="week"
          value={weekValue}
          onChange={e => setWeekValue(e.target.value)}
          size="small"
          slotProps={{ htmlInput: { sx: { fontSize: 14 } } }}
        />
        <Button variant="contained" startIcon={<Print />} onClick={() => window.open(printUrl, '_blank')}>
          {t('common.print')}
        </Button>
        <Button variant="contained" color="success" startIcon={<DownloadForOffline />} onClick={downloadPdf}>
          {t('common.downloadPdf')}
        </Button>
      </Box>
      <ReportsPage period="weekly" date={weekStart} />
    </Box>
  );
}
