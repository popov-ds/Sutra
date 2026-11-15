import { DomainError } from './errors';

const MAX_COURSE_DAYS = 3650;

export function assertCourseDuration(durationDays: number): number {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > MAX_COURSE_DAYS) {
    throw new DomainError('Длительность курса — целое число дней от 1 до 3650');
  }
  return durationDays;
}

export function prepareProductInput(name: string, durationDays: number): { name: string; durationDays: number } {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError('Укажите название продукта');
  if (trimmed.length > 80) throw new DomainError('Название продукта слишком длинное');
  return { name: trimmed, durationDays: assertCourseDuration(durationDays) };
}
