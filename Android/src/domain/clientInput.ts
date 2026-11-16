import { DomainError } from './errors';
import { CLIENT_STATUSES, type ClientStatus } from './types';

export type ClientInput = {
  name: string;
  phone: string;
  status: ClientStatus;
};

const LIMITS = {
  name: 120,
  phone: 40,
};

export function isClientStatus(value: string): value is ClientStatus {
  return (CLIENT_STATUSES as readonly string[]).includes(value);
}

export function prepareClientInput(input: ClientInput): ClientInput {
  const name = input.name.trim();
  if (!name) throw new DomainError('Укажите имя клиента');
  if (name.length > LIMITS.name) throw new DomainError('Имя слишком длинное');

  const phone = input.phone.trim();
  if (phone.length > LIMITS.phone) throw new DomainError('Телефон слишком длинный');

  if (!isClientStatus(input.status)) throw new DomainError('Неизвестный статус');

  return {
    name,
    phone,
    status: input.status,
  };
}
