import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', bgcolor: '#f5f5f5' }}>
      <Typography variant="h1" sx={{ fontWeight: 700, fontSize: 48 }} color="primary">401</Typography>
      <Typography variant="h5" sx={{ mb: 1 }}>{t('unauthorized.title')}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{t('unauthorized.description')}</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>{t('unauthorized.action')}</Button>
    </Box>
  );
}
