import { Children, type ReactNode } from 'react';
import { Box } from '@mui/material';

/** Keep equal-width fields readable within the actual remaining content width. */
export function AdminFilterToolbar({ label, children, action }: { label: string; children: ReactNode; action: ReactNode }) {
  const count = Children.count(children);
  return (
    <Box component="section" role="region" aria-label={label} data-admin-toolbar="true" sx={{ containerType: 'inline-size', minWidth: 0 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end', gap: 1.25 }}>
        <Box sx={{
          display: 'grid', minWidth: 0, gap: 1.25,
          gridTemplateColumns: `repeat(${Math.min(count, 3)}, minmax(0, 1fr))`,
          '@container (min-width: 1120px)': { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` },
          '& .MuiFormControl-root': { minWidth: 0 },
          '& .MuiInputBase-root': { bgcolor: 'background.paper' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#A6BDC6' },
        }}>{children}</Box>
        <Box sx={{ '& .MuiButton-root': { minWidth: 112, px: 2.5, whiteSpace: 'nowrap' } }}>{action}</Box>
      </Box>
    </Box>
  );
}
