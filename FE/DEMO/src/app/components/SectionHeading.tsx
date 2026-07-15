import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
}

export function SectionHeading({ title, description, action, align = 'left' }: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <Stack spacing={2} alignItems={centered ? 'center' : 'flex-start'} textAlign={align}>
      <Stack spacing={1} alignItems={centered ? 'center' : 'flex-start'}>
        <Typography component="h2" variant="h4">{title}</Typography>
        {description && (
          <Typography color="text.secondary" sx={{ maxWidth: '65ch', lineHeight: 1.7 }}>
            {description}
          </Typography>
        )}
      </Stack>
      {action && <Box>{action}</Box>}
    </Stack>
  );
}
