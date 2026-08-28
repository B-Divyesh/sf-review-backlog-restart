import { describe, expect, it } from 'vitest';
import { cardNoun } from './format';

describe('workload copy', () => {
  it('uses the singular noun for a one-card daily plan', () => {
    expect(cardNoun(1)).toBe('card');
    expect(cardNoun(2)).toBe('cards');
  });
});
