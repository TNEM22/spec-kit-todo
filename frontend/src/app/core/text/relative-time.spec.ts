import { describe, expect, it } from 'vitest';

import { relativeTime } from './relative-time';

const NOW = new Date('2026-10-11T12:00:00');

describe('relativeTime', () => {
  it('says just now for the last few seconds', () => {
    expect(relativeTime('2026-10-11T11:59:50', NOW)).toBe('just now');
  });
  it('uses minutes and hours', () => {
    expect(relativeTime('2026-10-11T11:58:00', NOW)).toBe('2 min ago');
    expect(relativeTime('2026-10-11T11:00:00', NOW)).toBe('1 h ago');
  });
  it('says Yesterday for the previous day and a short date before that', () => {
    expect(relativeTime('2026-10-10T20:00:00', NOW)).toBe('Yesterday');
    expect(relativeTime('2026-10-01T09:00:00', NOW)).toMatch(/1/);
  });
});
