import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'flex-end' }}>
      <Box>
        {eyebrow && <Typography variant="overline" color="secondary.dark" fontWeight={800} letterSpacing=".08em">{eyebrow}</Typography>}
        <Typography component="h1" variant="h3" sx={{ mt: eyebrow ? 0.5 : 0 }}>{title}</Typography>
        {description && <Typography color="text.secondary" sx={{ mt: 1.25, maxWidth: 720, lineHeight: 1.7 }}>{description}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}
