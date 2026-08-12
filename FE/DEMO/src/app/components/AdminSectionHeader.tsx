import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function AdminSectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={3}>
      <Box>
        <Typography component="h1" variant="h4" fontWeight={850}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: '68ch' }}>{description}</Typography>
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
}
