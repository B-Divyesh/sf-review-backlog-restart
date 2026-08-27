import type { Card, DaySchedule, PlanKind, RecoveryPlan, Settings } from './types';

const DAY = 86400000;

function isoAfter(day: number, start = new Date()): string {
  const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

export function orderCards(cards: Card[], kind: PlanKind): Card[] {
  return [...cards].sort((a, b) => {
    if (kind === 'protect') return b.risk - a.risk || b.daysOverdue - a.daysOverdue;
    if (kind === 'clear') return a.intervalDays - b.intervalDays || b.daysOverdue - a.daysOverdue;
    return (b.risk * 0.72 + b.daysOverdue * 0.28) - (a.risk * 0.72 + a.daysOverdue * 0.28);
  });
}

function deadlineDays(deadline: string, now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(`${deadline}T00:00:00`).getTime();
  return Math.max(1, Math.floor((end - start) / DAY) + 1);
}

function schedule(cards: Card[], perDay: number, minutes: number, start = new Date()): DaySchedule[] {
  const days = Math.ceil(cards.length / perDay);
  return Array.from({ length: days }, (_, index) => {
    const slice = cards.slice(index * perDay, (index + 1) * perDay);
    return {
      day: index + 1,
      date: isoAfter(index + 1, start),
      cards: slice.length,
      minutes: Math.ceil((slice.length / perDay) * minutes),
      highRisk: slice.filter((card) => card.riskBand === 'high').length,
      remaining: Math.max(0, cards.length - (index + 1) * perDay),
    };
  });
}

export function simulatePlans(cards: Card[], settings: Settings, now = new Date()): RecoveryPlan[] {
  const capacity = Math.max(1, Math.floor((settings.dailyMinutes * 60) / settings.secondsPerCard));
  const untilDeadline = deadlineDays(settings.deadline, now);
  const needed = Math.ceil(cards.length / untilDeadline);
  const variants: Array<{ kind: PlanKind; name: string; kicker: string; description: string; multiplier: number }> = [
    { kind: 'protect', name: 'Protect memory', kicker: 'Risk first', description: 'Put fragile and very late cards first. The tail may extend beyond your date.', multiplier: 0.78 },
    { kind: 'balanced', name: 'Steady return', kicker: 'Recommended', description: 'Use your full time box and mix urgency with momentum.', multiplier: 1 },
    { kind: 'clear', name: 'Clear by date', kicker: 'Deadline first', description: 'Meet the date only when the required daily load still fits your time box.', multiplier: needed / capacity },
  ];
  return variants.map((variant) => {
    const unclamped = variant.kind === 'clear' ? needed : Math.max(1, Math.floor(capacity * variant.multiplier));
    const dailyCards = Math.max(1, variant.kind === 'clear' ? Math.min(needed, capacity) : unclamped);
    const ordered = orderCards(cards, variant.kind);
    const planSchedule = schedule(ordered, dailyCards, Math.ceil((dailyCards * settings.secondsPerCard) / 60), now);
    const projectedDays = planSchedule.length;
    const byDeadline = Math.min(cards.length, dailyCards * untilDeadline);
    const highRiskTotal = cards.filter((card) => card.riskBand === 'high').length;
    const highRiskByDay3 = ordered.slice(0, dailyCards * 3).filter((card) => card.riskBand === 'high').length;
    return {
      kind: variant.kind,
      name: variant.name,
      kicker: variant.kicker,
      description: variant.description,
      dailyCards,
      dailyMinutes: Math.ceil((dailyCards * settings.secondsPerCard) / 60),
      projectedDays,
      deadlineMet: projectedDays <= untilDeadline,
      cardsByDeadline: byDeadline,
      highRiskByDay3: Math.min(highRiskTotal, highRiskByDay3),
      schedule: planSchedule,
    };
  });
}

export function assignCards(cards: Card[], plan: RecoveryPlan): Array<Card & { actionDay: number; actionDate: string; actionTag: string }> {
  return orderCards(cards, plan.kind).map((card, index) => {
    const day = Math.floor(index / plan.dailyCards) + 1;
    return {
      ...card,
      actionDay: day,
      actionDate: plan.schedule[day - 1]?.date ?? '',
      actionTag: `rbr::day-${String(day).padStart(2, '0')} rbr::risk-${card.riskBand}`,
    };
  });
}
