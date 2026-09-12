import { useState } from 'react';
import { Box, Paper, Avatar, Typography, TextField, Button, Alert } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LockScreen() {
  const { user, unlock, logout } = useAuth();
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await unlock(password);
    } catch {
      setError(t('auth.invalidPassword') || 'Wrong password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'grey.900',
    }}>
      <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 360 }}>
        <Lock sx={{ fontSize: 48, color: 'primary.main' }} />
        <Avatar sx={{ width: 72, height: 72, fontSize: 28, bgcolor: 'primary.main' }}>
          {user?.firstName?.charAt(0)}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{user?.firstName} {user?.lastName}</Typography>
        <Typography variant="body2" color="text.secondary">{user?.role}</Typography>
        <Box component="form" onSubmit={handleUnlock} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {error && <Alert severity="error" sx={{ py: 0, px: 1.5 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            type="password"
            placeholder={t('auth.password') || 'Password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            size="small"
          />
          <Button type="submit" variant="contained" fullWidth disabled={loading || !password}>
            {t('auth.unlock') || 'Unlock'}
          </Button>
        </Box>
        <Button size="small" color="error" onClick={logout}>
          {t('auth.logout')}
        </Button>
      </Paper>
    </Box>
  );
}
