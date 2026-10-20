import { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { Print, DownloadForOffline } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';
import ReportsPage from './ReportsPage';
import { downloadReportPdf } from './reportPdf';

const toMonthInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export default function MonthlyReportPage() {
  const { t } = useLanguage();
  const token = localStorage.getItem('accessToken');
  const [month, setMonth] = useState(() => toMonthInput(new Date()));

  const year = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));
  const monthIndex = monthNum - 1;

  const printUrl = `${api.defaults.baseURL}/dashboard/monthly-report?token=${token}&month=${monthIndex}&year=${year}`;

  const downloadPdf = () => downloadReportPdf(`${printUrl}&autoprint=0`, `monthly-report-${year}-${monthNum}.pdf`);

  return (
    <Box>
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
      </Box>
      <ReportsPage period="monthly" />
    </Box>
  );
}
