/**
 * Date helper utilities for dynamic test execution.
 * Requirement: "дати динамічно: now + N" (Slide 51)
 * Eliminates static/hardcoded dates across all test suites.
 */

export interface DynamicReservationInterval {
  startDate: Date;
  endDate: Date;
  startTimeIso: string;
  endTimeIso: string;
  mediumDateString: string;
  timeRangeString: string;
}

/**
 * Creates dynamic future date at now + daysAhead (plus optional hours).
 */
export function getFutureDate(daysAhead: number = 1, hoursAhead: number = 2): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(d.getHours() + hoursAhead, 0, 0, 0);
  return d;
}

/**
 * Formats a Date object matching Angular's `date:'mediumDate'` pipe (e.g. "Nov 6, 2026" or "6 Nov 2026").
 */
export function formatMediumDate(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats time matching Angular's `date:'HH:mm'` (e.g. "16:00").
 */
export function formatTimeHHmm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Generates an end-to-end dynamic reservation interval (now + N days).
 */
export function createDynamicReservationInterval(
  daysAhead: number = 2,
  durationHours: number = 2
): DynamicReservationInterval {
  const startDate = getFutureDate(daysAhead, 3);
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

  return {
    startDate,
    endDate,
    startTimeIso: startDate.toISOString(),
    endTimeIso: endDate.toISOString(),
    mediumDateString: formatMediumDate(startDate),
    timeRangeString: `${formatTimeHHmm(startDate)} – ${formatTimeHHmm(endDate)}`,
  };
}
