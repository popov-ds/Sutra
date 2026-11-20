import type { AppLanguage } from "../i18n.js";
import { DomainError } from "./validate.js";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RU_DATE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export function assertIsoDate(value: string): string {
  const match = ISO_DATE.exec(value);
  if (!match) throw new DomainError("date_format");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new DomainError("date_invalid");
  }
  return value;
}

export function parseUserDate(value: string): string {
  const trimmed = value.trim();
  const russian = RU_DATE.exec(trimmed);
  if (russian) return assertIsoDate(`${russian[3]}-${russian[2]}-${russian[1]}`);
  return assertIsoDate(trimmed);
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  if (!Number.isInteger(days)) throw new DomainError("date_offset_integer");
  const [year, month, day] = assertIsoDate(isoDate).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function formatRuDate(isoDate: string): string {
  const [y, m, d] = assertIsoDate(isoDate).split("-");
  return `${d}.${m}.${y}`;
}

export function formatLocaleDate(isoDate: string, lang: AppLanguage): string {
  const [year, month, day] = assertIsoDate(isoDate).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (lang === "en") {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  return formatRuDate(isoDate);
}

export function compareIsoDates(left: string, right: string): number {
  return assertIsoDate(left).localeCompare(assertIsoDate(right));
}