import { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { Print, DownloadForOffline } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';
import ReportsPage from './ReportsPage';
import { downloadReportPdf } from './reportPdf';

const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function DailyReportPage() {
  const { t } = useLanguage();
  const token = localStorage.getItem('accessToken');
  const [date, setDate] = useState(() => toDateInput(new Date()));

  const reportUrl = `${api.defaults.baseURL}/dashboard/daily-report?token=${token}&date=${date}`;

  const downloadPdf = () => downloadReportPdf(`${reportUrl}&autoprint=0`, `daily-report-${date}.pdf`);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          size="small"
          slotProps={{ htmlInput: { sx: { fontSize: 14 } } }}
        />
        <Button variant="contained" startIcon={<Print />} onClick={() => window.open(reportUrl, '_blank')}>
          {t('common.print')}
        </Button>
        <Button variant="contained" color="success" startIcon={<DownloadForOffline />} onClick={downloadPdf}>
          {t('common.downloadPdf')}
        </Button>
      </Box>
      <ReportsPage period="daily" date={date} />
    </Box>
  );
}
