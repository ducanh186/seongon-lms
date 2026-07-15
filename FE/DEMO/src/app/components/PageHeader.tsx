import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <Stack spacing={2} alignItems="flex-start">
      <Stack spacing={1}>
        {eyebrow && <Typography variant="overline" color="primary.dark" fontWeight={800} letterSpacing=".08em">{eyebrow}</Typography>}
        <Typography component="h1" variant="h3" sx={{ mt: eyebrow ? 0.5 : 0 }}>{title}</Typography>
        {description && <Typography color="text.secondary" sx={{ maxWidth: '65ch', lineHeight: 1.7 }}>{description}</Typography>}
      </Stack>
      {action && <Box>{action}</Box>}
    </Stack>
  );
}
