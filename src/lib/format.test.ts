import { describe, expect, it } from 'vitest';
import { formatPeso, formatTime, pluralize } from './format';

describe('formatPeso', () => {
  it('formats whole pesos with the peso sign and no decimals', () => {
    expect(formatPeso(320)).toBe('₱320');
    expect(formatPeso(1250)).toBe('₱1,250');
  });
});

describe('formatTime', () => {
  it('converts 24-hour times to 12-hour with AM/PM', () => {
    expect(formatTime('15:30')).toBe('3:30 PM');
    expect(formatTime('09:05')).toBe('9:05 AM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('leaves anything else alone', () => {
    expect(formatTime('')).toBe('');
    expect(formatTime('soon')).toBe('soon');
  });
});

describe('pluralize', () => {
  it('picks singular or plural', () => {
    expect(pluralize(1, 'drink')).toBe('1 drink');
    expect(pluralize(3, 'drink')).toBe('3 drinks');
  });
});
