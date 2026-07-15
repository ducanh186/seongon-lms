import { Chip } from '@mui/material';

const states = {
  active: { label: 'Đang hoạt động', color: 'primary' },
  locked: { label: 'Đã khóa', color: 'default' },
  published: { label: 'Đang xuất bản', color: 'primary' },
  draft: { label: 'Bản nháp', color: 'default' },
  visible: { label: 'Hiển thị', color: 'primary' },
  hidden: { label: 'Đã ẩn', color: 'default' },
} as const;

export function StatusChip({ status }: { status: keyof typeof states }) {
  const state = states[status];
  return <Chip size="small" label={state.label} color={state.color} variant={state.color === 'default' ? 'outlined' : 'filled'} sx={{ borderRadius: '8px', fontWeight: 700 }} />;
}
