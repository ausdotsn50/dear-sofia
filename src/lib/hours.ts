// Turns the free-text `days` in site.hours into schema.org day names for JSON-LD.
// Anything it can't read returns null, and SeoHead leaves the hours out.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type DayName = (typeof DAYS)[number];

function dayIndex(word: string): number {
  const w = word.toLowerCase().replace(/\.$/, '');
  if (w.length < 2) return -1;
  return DAYS.findIndex((day) => day.toLowerCase().startsWith(w) && (w.length >= 3 || /^(mo|tu|we|th|fr|sa|su)$/.test(w)));
}

/** "Tuesday to Sunday" → Tuesday…Sunday; "Mon–Fri", "Sat and Sun", "Daily" also work. */
export function parseDays(text: string): DayName[] | null {
  const input = text.trim().toLowerCase();
  if (/^(daily|every ?day|everyday|all week|mon(day)?\s*(-|–|—|to)\s*sun(day)?)$/.test(input)) return [...DAYS];

  const result = new Set<DayName>();
  for (const part of input.split(/\s*(?:,|&|\band\b)\s*/).filter(Boolean)) {
    const range = part.split(/\s*(?:-|–|—|\bto\b|\bthrough\b|\bthru\b)\s*/).filter(Boolean);
    if (range.length === 1) {
      const i = dayIndex(range[0]!);
      if (i === -1) return null;
      result.add(DAYS[i]!);
    } else if (range.length === 2) {
      const start = dayIndex(range[0]!);
      const end = dayIndex(range[1]!);
      if (start === -1 || end === -1) return null;
      for (let i = start; ; i = (i + 1) % 7) {
        result.add(DAYS[i]!);
        if (i === end) break;
      }
    } else {
      return null;
    }
  }
  return result.size ? DAYS.filter((day) => result.has(day)) : null;
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
