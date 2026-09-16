import { describe, expect, it } from 'vitest';
import { mealTypeByHour } from '../src/recommend.js';

describe('mealTypeByHour', () => {
  it.each([
    [5, 'breakfast'],
    [9, 'breakfast'],
    [10, 'lunch'],
    [14, 'lunch'],
    [15, 'dinner'],
    [2, 'dinner']
  ])('将 %i 点映射为 %s', (hour, expected) => {
    const date = new Date(2026, 0, 1, hour);
    expect(mealTypeByHour(date)).toBe(expected);
  });
});
