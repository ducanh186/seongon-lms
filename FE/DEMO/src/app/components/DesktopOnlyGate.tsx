import { Box, Typography, useMediaQuery } from '@mui/material';
import type { PropsWithChildren } from 'react';

const DESKTOP_QUERY = '(min-width:1280px)';

export function DesktopOnlyGate({ children }: PropsWithChildren) {
  const supported = useMediaQuery(DESKTOP_QUERY, { noSsr: true });

  if (!supported) {
    return (
      <Box
        role="status"
        sx={{
          minHeight: '100dvh',
          width: '100%',
          display: 'grid',
          placeItems: 'center',
          p: 4,
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="h5" textAlign="center" maxWidth={640}>
          Vui lòng sử dụng màn hình máy tính để có trải nghiệm đầy đủ.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
