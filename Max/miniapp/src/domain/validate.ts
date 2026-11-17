export type DomainErrorCode =
  | "name"
  | "phone"
  | "status"
  | "product"
  | "duration"
  | "limit"
  | "in_use"
  | "not_found";

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: DomainErrorCode = "name",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const CLIENT_STATUSES = ["newbie", "regular", "candidate", "partner"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export function prepareClientInput(input: {
  name: string;
  phone: string;
  status: string;
}): { name: string; phone: string; status: ClientStatus } {
  const name = input.name.trim();
  if (!name) throw new DomainError("Укажите имя клиента");
  if (name.length > 120) throw new DomainError("Имя слишком длинное");
  const phone = input.phone.trim();
  if (phone.length > 40) throw new DomainError("Телефон слишком длинный");
  const status = input.status as ClientStatus;
  if (!CLIENT_STATUSES.includes(status)) throw new DomainError("Неизвестный статус", "status");
  return { name, phone, status };
}

export function prepareProductInput(name: string, durationDays: number): { name: string; durationDays: number } {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError("Укажите название продукта", "product");
  if (trimmed.length > 80) throw new DomainError("Название слишком длинное", "product");
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
    throw new DomainError("Срок курса: от 1 до 3650 дней", "duration");
  }
  return { name: trimmed, durationDays };
}

export function prepareClientRequestInput(name: string): { name: string } {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError("Укажите название запроса", "product");
  if (trimmed.length > 120) throw new DomainError("Слишком длинное название", "product");
  return { name: trimmed };
}