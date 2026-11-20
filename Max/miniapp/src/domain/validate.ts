export type DomainErrorCode =
  | "client_name_required"
  | "client_name_too_long"
  | "phone_too_long"
  | "additional_info_too_long"
  | "status_unknown"
  | "product_name_required"
  | "product_name_too_long"
  | "request_name_required"
  | "request_name_too_long"
  | "duration_range"
  | "date_format"
  | "date_invalid"
  | "date_offset_integer"
  | "free_limit"
  | "client_request_not_found"
  | "client_not_found"
  | "product_not_found"
  | "product_in_use"
  | "request_in_use";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    readonly param?: number,
  ) {
    super(code);
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
  if (!name) throw new DomainError("client_name_required");
  if (name.length > 120) throw new DomainError("client_name_too_long");
  const phone = input.phone.trim();
  if (phone.length > 40) throw new DomainError("phone_too_long");
  const status = input.status as ClientStatus;
  if (!CLIENT_STATUSES.includes(status)) throw new DomainError("status_unknown");
  return { name, phone, status };
}

export function prepareProductInput(name: string, durationDays: number): { name: string; durationDays: number } {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError("product_name_required");
  if (trimmed.length > 80) throw new DomainError("product_name_too_long");
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
    throw new DomainError("duration_range");
  }
  return { name: trimmed, durationDays };
}

export function prepareClientRequestInput(name: string): { name: string } {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError("request_name_required");
  if (trimmed.length > 120) throw new DomainError("request_name_too_long");
  return { name: trimmed };
}