import { describe, expect, it } from 'vitest';
import { parseAnkiCsv, riskFor, splitRows } from './csv';

const now = new Date('2026-08-27T12:00:00Z');

describe('CSV import', () => {
  it('parses quoted cells, aliases, and scheduling facts', () => {
    const csv = `Deck Name,Question,Answer,Due Date,Interval Days,Lapses,Reviews,Tags\nCore,"hello, world","a ""quoted"" answer",2026-08-20,7,2,14,greeting`;
    const result = parseAnkiCsv(csv, now);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({ deck: 'Core', front: 'hello, world', daysOverdue: 7, intervalDays: 7, lapses: 2 });
    expect(result.cards[0].back).toBe('a "quoted" answer');
  });

  it('detects TSV and ignores future cards with a visible warning', () => {
    const tsv = `Front\tDue\tInterval\nDue card\t2026-08-20\t5\nFuture card\t2026-09-01\t5`;
    const result = parseAnkiCsv(tsv, now);
    expect(result.delimiter).toBe('\t');
    expect(result.cards.map((card) => card.front)).toEqual(['Due card']);
    expect(result.warnings.join(' ')).toContain('not-yet-due');
  });

  it('explains missing required headers', () => {
    expect(() => parseAnkiCsv('Front,Back\nQuestion,Answer', now)).toThrow('Missing Due, Interval');
  });

  it('keeps embedded newlines inside a quoted field', () => {
    expect(splitRows('Front,Due,Interval\n"line one\nline two",2026-08-20,3')).toHaveLength(2);
  });
});

describe('risk heuristic', () => {
  it('prioritizes relatively late, lapsed, young cards', () => {
    const fragile = riskFor(30, 3, 4, 8);
    const stable = riskFor(3, 90, 0, 20);
    expect(fragile.risk).toBeGreaterThan(stable.risk);
    expect(fragile.riskBand).toBe('high');
    expect(fragile.riskReasons).toContain('young interval');
  });
});
