/**
 * Hijri / Gregorian date formatting (matches old app hijri-date.js).
 * Uses Intl with islamic-umalqura; Bangladesh offset applied for Hijri.
 * Preference: localStorage key 'waqf_use_hijri' (same as old app).
 */

const USE_HIJRI_KEY = 'waqf_use_hijri';
const BANGLADESH_OFFSET_DAYS = 1;

function applyBangladeshOffset(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - BANGLADESH_OFFSET_DAYS);
  return d;
}

function toDate(dateInput: Date | string | number | undefined | null): Date | null {
  if (dateInput == null) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return null;
  return date;
}

export function getUseHijri(): boolean {
  try {
    const stored = localStorage.getItem(USE_HIJRI_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export function setUseHijri(use: boolean): void {
  try {
    localStorage.setItem(USE_HIJRI_KEY, String(use));
  } catch {}
}

export type FormatDateOptions = {
  weekday?: 'short' | 'long' | 'narrow';
  month?: 'short' | 'long' | 'numeric' | '2-digit';
  day?: 'numeric' | '2-digit';
  year?: 'numeric' | '2-digit';
  locale?: string;
};

function formatHijri(date: Date, options: FormatDateOptions & { calendar?: string } = {}, locale: string): string {
  const d = applyBangladeshOffset(date);
  const loc = locale === 'bn' ? 'bn' : 'en';
  const opts = {
    day: '2-digit' as const,
    month: '2-digit' as const,
    year: '2-digit' as const,
    calendar: 'islamic-umalqura' as const,
    ...options
  };
  try {
    const formatter = new Intl.DateTimeFormat(loc, opts);
    const parts = formatter.formatToParts(d);
    const withoutEra = parts.filter((p) => p.type !== 'era');
    const day = withoutEra.find((p) => p.type === 'day');
    const month = withoutEra.find((p) => p.type === 'month');
    const year = withoutEra.find((p) => p.type === 'year');
    if (options.weekday === undefined && day && month && year) {
      return `${day.value}/${month.value}/${year.value}`;
    }
    return withoutEra.map((p) => p.value).join('').replace(/\s+/g, ' ').trim();
  } catch {
    const formatter = new Intl.DateTimeFormat('en', opts);
    const parts = formatter.formatToParts(d);
    const withoutEra = parts.filter((p) => p.type !== 'era');
    const day = withoutEra.find((p) => p.type === 'day');
    const month = withoutEra.find((p) => p.type === 'month');
    const year = withoutEra.find((p) => p.type === 'year');
    if (options.weekday === undefined && day && month && year) {
      return `${day.value}/${month.value}/${year.value}`;
    }
    return withoutEra.map((p) => p.value).join('').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Main formatter. When Hijri is enabled returns Hijri (Bangladesh); otherwise Gregorian.
 */
export function formatDateDisplay(
  dateInput: Date | string | number | undefined | null,
  options: FormatDateOptions = {},
  useHijri?: boolean
): string {
  const date = toDate(dateInput);
  if (!date) return '';
  const hijri = useHijri ?? getUseHijri();
  const locale = options.locale === 'bn' ? 'bn' : 'en';

  if (!hijri) {
    const opt: Intl.DateTimeFormatOptions = {
      day: options.day ?? '2-digit',
      month: options.month ?? '2-digit',
      year: options.year ?? '2-digit',
      ...(options.weekday && { weekday: options.weekday })
    };
    try {
      return date.toLocaleDateString(locale === 'bn' ? 'bn-BD' : undefined, opt);
    } catch {
      const d = date.getDate();
      const m = date.getMonth() + 1;
      const y = date.getFullYear() % 100;
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(2, '0')}`;
    }
  }
  return formatHijri(date, options, locale);
}

export function formatDateDisplayDayOnly(
  dateInput: Date | string | number | undefined | null,
  useHijri?: boolean
): string {
  const date = toDate(dateInput);
  if (!date) return '';
  const hijri = useHijri ?? getUseHijri();
  if (!hijri) return String(date.getDate());
  const d = applyBangladeshOffset(date);
  try {
    const formatter = new Intl.DateTimeFormat('en', { day: 'numeric', calendar: 'islamic-umalqura' });
    const parts = formatter.formatToParts(d);
    const dayPart = parts.find((p) => p.type === 'day');
    return dayPart ? dayPart.value : String(date.getDate());
  } catch {
    return String(date.getDate());
  }
}

export function formatDateDisplayLong(
  dateInput: Date | string | number | undefined | null,
  useHijri?: boolean
): string {
  return formatDateDisplay(dateInput, {
    weekday: 'long',
    year: '2-digit',
    month: 'long',
    day: 'numeric'
  }, useHijri);
}

export function formatDateDisplayShort(
  dateInput: Date | string | number | undefined | null,
  useHijri?: boolean
): string {
  return formatDateDisplay(dateInput, { month: '2-digit', day: '2-digit', year: '2-digit' }, useHijri);
}

export function formatDateTimeDisplay(
  dateInput: Date | string | number | undefined | null,
  locale: string = 'en',
  useHijri?: boolean
): string {
  const date = toDate(dateInput);
  if (!date) return '';
  const timeStr = date.toLocaleTimeString(locale === 'bn' ? 'bn-BD' : undefined, { hour: '2-digit', minute: '2-digit' });
  return formatDateDisplay(dateInput, {}, useHijri) + ' ' + timeStr;
}
