import { describe, expect, it } from 'vitest';
import { isTime, parseDays } from './hours';

describe('parseDays', () => {
  it('reads ranges in words or abbreviations', () => {
    expect(parseDays('Tuesday to Sunday')).toEqual(['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(parseDays('Mon–Fri')).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    expect(parseDays('Fri - Mon')).toEqual(['Monday', 'Friday', 'Saturday', 'Sunday']);
  });

  it('reads lists and every day', () => {
    expect(parseDays('Saturday and Sunday')).toEqual(['Saturday', 'Sunday']);
    expect(parseDays('Mon, Wed, Fri')).toEqual(['Monday', 'Wednesday', 'Friday']);
    expect(parseDays('Daily')).toHaveLength(7);
  });

  it('returns null for anything it cannot read', () => {
    expect(parseDays('Holidays')).toBeNull();
    expect(parseDays('')).toBeNull();
    expect(parseDays('M to F')).toBeNull();
  });
});

describe('isTime', () => {
  it('accepts 24-hour HH:MM only', () => {
    expect(isTime('08:00')).toBe(true);
    expect(isTime('23:59')).toBe(true);
    expect(isTime('8:00')).toBe(false);
    expect(isTime('24:00')).toBe(false);
  });
});
