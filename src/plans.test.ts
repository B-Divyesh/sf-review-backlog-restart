import { describe, expect, it } from 'vitest';
import { assignCards, simulatePlans } from './plans';
import type { Card } from './types';

function cards(count: number): Card[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `c${index}`, deck: 'Deck', front: `Card ${index}`, back: '', dueDate: '2026-08-01', intervalDays: (index % 20) + 1,
    ease: 2.5, lapses: index % 5, reviews: 10, tags: '', daysOverdue: 26, risk: 100 - index,
    riskBand: index < 25 ? 'high' : index < 60 ? 'watch' : 'stable', riskReasons: ['late'],
  }));
}

describe('recovery plans', () => {
  const now = new Date('2026-08-27T12:00:00Z');
  const settings = { dailyMinutes: 20, secondsPerCard: 20, deadline: '2026-09-05' };

  it('keeps every plan within the daily capacity', () => {
    const plans = simulatePlans(cards(100), settings, now);
    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      expect(plan.dailyCards).toBeLessThanOrEqual(60);
      expect(plan.dailyMinutes).toBeLessThanOrEqual(20);
      expect(plan.schedule.at(-1)?.remaining).toBe(0);
    }
  });

  it('places high-risk cards first in the protection route', () => {
    const plan = simulatePlans(cards(100), settings, now)[0];
    const assigned = assignCards(cards(100), plan);
    expect(assigned[0].risk).toBe(100);
    expect(assigned[0].actionTag).toContain('rbr::day-01');
    expect(assigned[0].actionTag).toContain('risk-high');
  });

  it('states when an impossible deadline cannot be met', () => {
    const [,, clear] = simulatePlans(cards(500), { dailyMinutes: 5, secondsPerCard: 30, deadline: '2026-08-28' }, now);
    expect(clear.deadlineMet).toBe(false);
    expect(clear.dailyCards).toBe(10);
    expect(clear.cardsByDeadline).toBe(20);
  });
});
