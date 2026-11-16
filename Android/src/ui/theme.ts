import type { TaskCategory } from '@/domain/types';

export const theme = {
  bg: '#F4F1EA',
  card: '#FFFCF7',
  ink: '#1C1915',
  muted: '#6F675E',
  line: '#E4DDD2',
  service: '#0F6E6B',
  upsell: '#8A5A00',
  partnership: '#4E3D78',
  danger: '#8E2F2F',
  ok: '#2E6B4F',
  white: '#FFFFFF',
};

export const categoryColor: Record<TaskCategory, { ink: string; soft: string }> = {
  service: { ink: theme.service, soft: '#E4F3F2' },
  upsell: { ink: theme.upsell, soft: '#F8EEDD' },
  partnership: { ink: theme.partnership, soft: '#EEEAF6' },
};
