import { Box, Container, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { layoutTokens } from '../theme';

export type MetricItem = {
  label: string;
  value?: string | number;
  icon: ReactNode;
};

export function MetricsStrip({ items }: { items: MetricItem[] }) {
  return (
    <Box component="section" aria-label="Thông tin nền tảng" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Container
        maxWidth={false}
        sx={{
          maxWidth: layoutTokens.contentMaxWidth,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        }}
      >
        {items.map((item) => (
          <Stack
            key={item.label}
            alignItems="center"
            justifyContent="center"
            spacing={0.75}
            sx={{ px: 1.5, py: 2.5, textAlign: 'center' }}
          >
            <Box sx={{ display: 'grid', placeItems: 'center', color: 'primary.main', minHeight: 28 }}>{item.icon}</Box>
            {item.value != null && <Typography variant="h5">{item.value}</Typography>}
            <Typography variant="body2" fontWeight={700}>{item.label}</Typography>
          </Stack>
        ))}
      </Container>
    </Box>
  );
}
