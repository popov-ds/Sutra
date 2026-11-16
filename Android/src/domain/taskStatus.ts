import { compareIsoDates } from './dates';
import type { TaskStatus } from './types';

export function effectiveStatus(status: TaskStatus, touchOn: string, today: string): TaskStatus {
  if (status === 'done') return 'done';
  if (compareIsoDates(touchOn, today) < 0) return 'overdue';
  return 'pending';
}
