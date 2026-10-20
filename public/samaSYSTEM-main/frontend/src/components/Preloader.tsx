import { Box, CircularProgress } from '@mui/material';

export default function Preloader() {
  return (
    <Box
      sx={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={48} />
    </Box>
  );
}
