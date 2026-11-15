import type { ClientStatus, TaskCategory, TaskStatus } from './types';

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  newbie: 'Новичок',
  regular: 'Постоянный клиент',
  candidate: 'Кандидат',
  partner: 'Партнер',
};

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  service: 'Сервис',
  upsell: 'Допродажи',
  partnership: 'Партнерство',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Ожидает',
  done: 'Выполнено',
  overdue: 'Просрочено',
};
