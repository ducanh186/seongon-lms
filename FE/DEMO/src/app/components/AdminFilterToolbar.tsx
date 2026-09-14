import { Children, type ReactNode } from 'react';
import { Box, Button, Chip, Stack } from '@mui/material';

export type AdminActiveFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

/** Keep equal-width fields readable within the actual remaining content width. */
export function AdminFilterToolbar({
  label,
  children,
  action,
  onReset,
  resetDisabled = true,
  activeFilters = [],
}: {
  label: string;
  children: ReactNode;
  action: ReactNode;
  onReset?: () => void;
  resetDisabled?: boolean;
  activeFilters?: AdminActiveFilter[];
}) {
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
        <Stack direction="row" spacing={1} sx={{ '& .MuiButton-root': { minWidth: 112, px: 2.5, whiteSpace: 'nowrap' } }}>
          {onReset && <Button variant="text" color="inherit" disabled={resetDisabled} onClick={onReset}>Xóa bộ lọc</Button>}
          {action}
        </Stack>
      </Box>
      {activeFilters.length > 0 && <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }} aria-label="Bộ lọc đang áp dụng">
        {activeFilters.map((filter) => <Chip key={filter.key} size="small" label={filter.label} onDelete={filter.onRemove} />)}
      </Stack>}
    </Box>
  );
}
