import { useState } from 'react';
import {
  Box, Typography, Avatar, Paper, TextField, Button, Grid, Divider, Stack,
  Chip, IconButton, Alert, Snackbar, CircularProgress, Card, CardContent,
  useTheme, alpha,
} from '@mui/material';
import { Save, Lock, Edit, Close, CheckCircle } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const { t } = useLanguage();
  const { palette } = useTheme();
  const isDark = palette.mode === 'dark';

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const initials = `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      setSnack({ open: true, message: 'Profile updated', severity: 'success' });
      setEditing(false);
    } catch (e: any) {
      setSnack({ open: true, message: e?.response?.data?.message || 'Failed to update', severity: 'error' });
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setSnack({ open: true, message: 'Passwords do not match', severity: 'error' });
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setSnack({ open: true, message: 'Password changed', severity: 'success' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      setSnack({ open: true, message: e?.response?.data?.message || 'Failed to change password', severity: 'error' });
    } finally { setPwSaving(false); }
  };

  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Profile</Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: cardBg, borderRadius: 3, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${dividerColor}` }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar sx={{ width: 80, height: 80, fontSize: 30, bgcolor: 'primary.main', fontWeight: 700, mx: 'auto', mb: 2, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                {initials}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{user?.firstName} {user?.lastName}</Typography>
              <Chip label={user?.role} size="small" sx={{ mt: 1, borderRadius: '6px', fontWeight: 600, textTransform: 'capitalize' }} />
              <Divider sx={{ my: 2.5, borderColor: dividerColor }} />
              <Stack spacing={1.5} sx={{ textAlign: 'left', px: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Username</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{user?.username}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{user?.email}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{user?.phone || '-'}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Paper sx={{ p: 3, bgcolor: cardBg, borderRadius: 3, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${dividerColor}` }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Edit fontSize="small" color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Personal Information</Typography>
                </Stack>
                {!editing ? (
                  <Button size="small" startIcon={<Edit />} onClick={() => setEditing(true)}>Edit</Button>
                ) : (
                  <Stack direction="row" sx={{ gap: 1 }}>
                    <Button size="small" color="inherit" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button size="small" variant="contained" startIcon={saving ? <CircularProgress size={16} /> : <Save />} onClick={handleSave} disabled={saving}>
                      Save
                    </Button>
                  </Stack>
                )}
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth label="First Name" size="small"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth label="Last Name" size="small"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth label="Email" size="small" type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth label="Phone" size="small"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    disabled={!editing}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: cardBg, borderRadius: 3, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${dividerColor}` }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Lock fontSize="small" color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Change Password</Typography>
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth label="Current Password" size="small" type="password"
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth label="New Password" size="small" type="password"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-end' }}>
                    <TextField
                      fullWidth label="Confirm Password" size="small" type="password"
                      value={pwForm.confirmPassword}
                      onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    />
                    <Button
                      variant="contained"
                      onClick={handleChangePassword}
                      disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                      sx={{ minWidth: 40, height: 40, borderRadius: '10px' }}
                    >
                      {pwSaving ? <CircularProgress size={18} /> : <Lock fontSize="small" />}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
