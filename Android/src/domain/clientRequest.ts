import { DomainError } from './errors';

export function prepareClientRequestInput(name: string): { name: string } {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError('Укажите название запроса');
  if (trimmed.length > 120) throw new DomainError('Название запроса слишком длинное');
  return { name: trimmed };
}
