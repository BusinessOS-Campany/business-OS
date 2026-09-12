import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Typography variant="h1" sx={{ fontWeight: 700 }} color="primary">{t('page.notFound.title')}</Typography>
      <Typography variant="h5" sx={{ mb: 3 }}>{t('page.notFound')}</Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>{t('page.notFound.action')}</Button>
    </Box>
  );
}
