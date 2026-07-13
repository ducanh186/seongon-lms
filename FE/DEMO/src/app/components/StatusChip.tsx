import { Chip } from '@mui/material';

const states = {
  active: { label: 'Đang hoạt động', color: 'success' },
  locked: { label: 'Đã khóa', color: 'default' },
  published: { label: 'Đang xuất bản', color: 'success' },
  draft: { label: 'Bản nháp', color: 'warning' },
  visible: { label: 'Hiển thị', color: 'success' },
  hidden: { label: 'Đã ẩn', color: 'default' },
} as const;

export function StatusChip({ status }: { status: keyof typeof states }) {
  const state = states[status];
  return <Chip size="small" label={state.label} color={state.color} variant={state.color === 'default' ? 'outlined' : 'filled'} />;
}
