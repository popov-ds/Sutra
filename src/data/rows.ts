import { DomainError } from '@/domain/errors';
import type { ClientStatus, TaskCategory, TaskSource, TaskStatus, TaskType } from '@/domain/types';
import { CLIENT_STATUSES, TASK_CATEGORIES, TASK_SOURCES, TASK_STATUSES, TASK_TYPES } from '@/domain/types';

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  health_tags: string;
  family_notes: string;
  client_request_id: string | null;
  regular_since: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientRequestRow = {
  id: string;
  name: string;
};

export type ProductRow = {
  id: string;
  name: string;
  duration_days: number;
};

export type PurchaseRow = {
  id: string;
  client_id: string;
  product_id: string;
  product_name: string;
  purchased_on: string;
  created_at: string;
  duration_days: number;
};

export type TaskRow = {
  id: string;
  client_id: string;
  purchase_id: string | null;
  touch_on: string;
  type: string;
  category: string;
  title: string;
  details: string;
  status: string;
  source: string;
  dedupe_key: string;
  client_name?: string;
  client_phone?: string;
  product_name?: string | null;
};

export function parseHealthTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export function asClientStatus(value: string): ClientStatus {
  if ((CLIENT_STATUSES as readonly string[]).includes(value)) return value as ClientStatus;
  throw new DomainError(`Неизвестный статус клиента: ${value}`);
}

export function asTaskStatus(value: string): TaskStatus {
  if ((TASK_STATUSES as readonly string[]).includes(value)) return value as TaskStatus;
  throw new DomainError(`Неизвестный статус задачи: ${value}`);
}

export function asTaskCategory(value: string): TaskCategory {
  if ((TASK_CATEGORIES as readonly string[]).includes(value)) return value as TaskCategory;
  throw new DomainError(`Неизвестная категория задачи: ${value}`);
}

export function asTaskType(value: string): TaskType {
  if ((TASK_TYPES as readonly string[]).includes(value)) return value as TaskType;
  throw new DomainError(`Неизвестный тип задачи: ${value}`);
}

export function asTaskSource(value: string): TaskSource {
  if ((TASK_SOURCES as readonly string[]).includes(value)) return value as TaskSource;
  throw new DomainError(`Неизвестный источник задачи: ${value}`);
}
