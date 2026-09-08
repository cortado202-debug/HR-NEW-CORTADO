// Syrian Pounds (SYP) Currency Formatter and Arabic Date Helpers

/**
 * Format amount as Syrian Pounds (SYP / ليرة سورية)
 * Example: 1500000 -> "1,500,000 ل.س"
 */
export function formatSYP(amount: number | string | undefined | null, includeSymbol: boolean = true): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return includeSymbol ? `0 ل.س` : '0';
  }
  
  const num = Math.round(Number(amount));
  const formatted = new Intl.NumberFormat('en-US').format(num);
  
  return includeSymbol ? `${formatted} ل.س` : formatted;
}

/**
 * Format amount in Arabic spoken words if needed (e.g. 50 ألف ليرة)
 */
export function formatSYPShort(amount: number): string {
  if (!amount || isNaN(amount)) return '0 ل.س';
  if (amount >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 2);
    return `${millions} مليون ل.س`;
  }
  if (amount >= 1_000) {
    const thousands = (amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1);
    return `${thousands} ألف ل.س`;
  }
  return formatSYP(amount);
}

/**
 * Parse input string into numeric amount (strips commas, currency letters, spaces)
 */
export function parseSYPInput(val: string): number {
  if (!val) return 0;
  // replace Arabic digits with western digits if any
  const normalized = val
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[^\d]/g, '');
  const parsed = parseInt(normalized, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format plain number with thousand separators
 */
export function formatNumberWithCommas(num: number | string | undefined | null): string {
  if (num === undefined || num === null || isNaN(Number(num))) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(Number(num)));
}

/**
 * Get current date in YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in HH:mm
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formatted date string with Arabic weekday and English numerals (YYYY/MM/DD)
 * Example: "الثلاثاء، 2026/09/08" (Month as number, English numbers, no Arabic month name)
 */
const ARABIC_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function formatArabicDate(dateStr: string, includeDayName: boolean = true): string {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return dateStr;
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    if (isNaN(date.getTime())) return dateStr;

    const formattedNumeric = `${year}/${month}/${day}`;

    if (!includeDayName) {
      return formattedNumeric;
    }

    const dayName = ARABIC_WEEKDAYS[date.getDay()] || '';
    return `${dayName}، ${formattedNumeric}`;
  } catch {
    return dateStr;
  }
}

/**
 * Short date with month and day as numbers in English digits (e.g. 09/08)
 */
export function formatArabicShortDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return dateStr;
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${month}/${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Arabic day of week name (e.g. "السبت", "الأحد")
 */
export function getDayOfWeekArabic(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return '';
    const [year, month, day] = parts.map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return '';
    return ARABIC_WEEKDAYS[date.getDay()] || '';
  } catch {
    return '';
  }
}

/**
 * Month and year formatted with month as number in English digits (e.g. "شهر 09 / 2026")
 */
export function formatArabicMonth(yearMonth: string): string {
  if (!yearMonth) return '';
  try {
    const parts = yearMonth.split('-');
    if (parts.length < 2) return yearMonth;
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    return `شهر ${month} / ${year}`;
  } catch {
    return yearMonth;
  }
}

/**
 * Status badge helper for attendance records
 */
export function getStatusBadge(status: string): { label: string; bg: string; color: string } {
  switch (status) {
    case 'present':
      return { label: 'حاضر', bg: 'bg-emerald-50 border border-emerald-200', color: 'text-emerald-800' };
    case 'absent':
      return { label: 'غائب', bg: 'bg-rose-50 border border-rose-200', color: 'text-rose-800' };
    case 'late':
      return { label: 'متأخر', bg: 'bg-amber-50 border border-amber-200', color: 'text-amber-800' };
    case 'half_day':
      return { label: 'نصف يوم', bg: 'bg-blue-50 border border-blue-200', color: 'text-blue-800' };
    case 'departure':
      return { label: 'مغادرة', bg: 'bg-indigo-50 border border-indigo-200', color: 'text-indigo-800' };
    case 'leave':
      return { label: 'إجازة', bg: 'bg-purple-50 border border-purple-200', color: 'text-purple-800' };
    default:
      return { label: status || 'غير محدد', bg: 'bg-slate-100', color: 'text-slate-700' };
  }
}


