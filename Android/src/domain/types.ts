export const CLIENT_STATUSES = ['newbie', 'regular', 'candidate', 'partner'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const TASK_CATEGORIES = ['service', 'upsell', 'partnership'] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_TYPES = [
  'service_usage',
  'control_checkin',
  'result_checkpoint',
  'cross_sell',
  'reorder_reminder',
  'partnership_offer',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ['pending', 'done', 'overdue'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_SOURCES = ['purchase_cascade', 'reorder', 'partnership_window'] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export type Client = {
  id: string;
  name: string;
  phone: string;
  status: ClientStatus;
  healthTags: string[];
  additionalInfo: string;
  clientRequestId: string | null;
  regularSince: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  name: string;
  durationDays: number;
};

export type ClientRequest = {
  id: string;
  name: string;
};

export type Purchase = {
  id: string;
  clientId: string;
  productId: string;
  productName: string;
  purchasedOn: string;
  courseEndsOn: string;
  createdAt: string;
};

export type TaskDraft = {
  id: string;
  clientId: string;
  purchaseId: string | null;
  touchOn: string;
  type: TaskType;
  category: TaskCategory;
  title: string;
  details: string;
  status: 'pending';
  source: TaskSource;
  dedupeKey: string;
};

export type TaskRecord = Omit<TaskDraft, 'status'> & {
  status: TaskStatus;
};

export type TaskListItem = TaskRecord & {
  clientName: string;
  clientPhone: string;
  productName: string | null;
};
