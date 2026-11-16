import { DomainError } from './errors';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RU_DATE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export function assertIsoDate(value: string): string {
  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new DomainError('Дата должна быть в формате ГГГГ-ММ-ДД');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const sameCalendarDay =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  if (!sameCalendarDay) {
    throw new DomainError('Такой календарной даты нет');
  }

  return value;
}

export function parseUserDate(value: string): string {
  const trimmed = value.trim();
  const russian = RU_DATE.exec(trimmed);
  if (russian) {
    return assertIsoDate(`${russian[3]}-${russian[2]}-${russian[1]}`);
  }
  return assertIsoDate(trimmed);
}

export function addCalendarDays(isoDate: string, days: number): string {
  if (!Number.isInteger(days)) {
    throw new DomainError('Сдвиг даты должен быть целым числом дней');
  }

  const [year, month, day] = assertIsoDate(isoDate).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatRuDate(isoDate: string): string {
  const [year, month, day] = assertIsoDate(isoDate).split('-');
  return `${day}.${month}.${year}`;
}

export function isoDateToLocalDate(isoDate: string): Date {
  const [year, month, day] = assertIsoDate(isoDate).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function localDateToIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return assertIsoDate(`${date.getFullYear()}-${month}-${day}`);
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatRuDateLong(isoDate: string): string {
  return formatLongDate(isoDate, 'ru');
}

export function formatLongDate(isoDate: string, language: 'ru' | 'en'): string {
  const [year, month, day] = assertIsoDate(isoDate).split('-').map(Number);
  const monthName = language === 'ru' ? MONTHS_GENITIVE[month - 1] : MONTHS_EN[month - 1];
  return `${day} ${monthName} ${year}`;
}

export function compareIsoDates(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
