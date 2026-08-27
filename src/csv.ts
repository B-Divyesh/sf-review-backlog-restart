import type { Card, ParseResult } from './types';

const aliases: Record<string, string[]> = {
  deck: ['deck', 'deck name', 'deckname'],
  front: ['front', 'question', 'term', 'prompt'],
  back: ['back', 'answer', 'definition', 'response'],
  dueDate: ['due', 'due date', 'duedate', 'next review', 'nextreview'],
  intervalDays: ['interval', 'interval days', 'ivl', 'intervaldays'],
  ease: ['ease', 'ease factor', 'factor', 'easefactor'],
  lapses: ['lapses', 'lapse count', 'lapsecount'],
  reviews: ['reviews', 'review count', 'reps', 'reviewcount'],
  tags: ['tags', 'tag'],
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/^#/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function detectDelimiter(text: string): ',' | '\t' | ';' {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const scores = { ',': 0, '\t': 0, ';': 0 };
  let quoted = false;
  for (const char of first) {
    if (char === '"') quoted = !quoted;
    if (!quoted && char in scores) scores[char as keyof typeof scores]++;
  }
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || ',') as ',' | '\t' | ';';
}

export function splitRows(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const clean = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"') {
      if (quoted && clean[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function parseDate(value: string, today: Date): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (calendar) return new Date(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]));
  if (/^-?\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (numeric > 1_000_000_000) return new Date(numeric * 1000);
    if (numeric > 20_000 && numeric < 100_000) return new Date((numeric - 25569) * 86400000);
    if (numeric >= 0 && numeric < 100_000) return new Date(today.getTime() + numeric * 86400000);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function numeric(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat((value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function makeMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [key, candidates] of Object.entries(aliases)) {
    const index = headers.findIndex((header) => candidates.includes(normalize(header)));
    if (index >= 0) map[key] = index;
  }
  return map;
}

export function riskFor(daysOverdue: number, intervalDays: number, lapses: number, reviews: number): Pick<Card, 'risk' | 'riskBand' | 'riskReasons'> {
  const relativeDelay = daysOverdue / Math.max(1, intervalDays);
  const overduePoints = Math.min(52, Math.log2(daysOverdue + 1) * 9);
  const relativePoints = Math.min(25, relativeDelay * 14);
  const lapsePoints = Math.min(18, lapses * 4.5);
  const youngPoints = intervalDays <= 3 ? 10 : intervalDays <= 10 ? 5 : 0;
  const unseenPoints = reviews === 0 ? 8 : 0;
  const risk = Math.max(0, Math.min(100, Math.round(overduePoints + relativePoints + lapsePoints + youngPoints + unseenPoints)));
  const reasons: string[] = [];
  if (daysOverdue > 0) reasons.push(`${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`);
  if (relativeDelay >= 1) reasons.push('delay exceeds its interval');
  if (lapses >= 2) reasons.push(`${lapses} past lapses`);
  if (intervalDays <= 3) reasons.push('young interval');
  if (!reasons.length) reasons.push('lower scheduling pressure');
  return { risk, riskBand: risk >= 65 ? 'high' : risk >= 38 ? 'watch' : 'stable', riskReasons: reasons };
}

export function parseAnkiCsv(text: string, today = new Date()): ParseResult {
  if (!text.trim()) throw new Error('This file is empty. Export cards with headers and try again.');
  const delimiter = detectDelimiter(text);
  const rows = splitRows(text, delimiter);
  if (rows.length < 2) throw new Error('We found no card rows. Include a header row followed by at least one card.');
  const headers = rows[0].map((value) => value.trim());
  const map = makeMap(headers);
  const required = ['front', 'dueDate', 'intervalDays'];
  const missing = required.filter((key) => map[key] === undefined);
  if (missing.length) {
    throw new Error(`Missing ${missing.map((key) => key === 'dueDate' ? 'Due' : key === 'intervalDays' ? 'Interval' : 'Front').join(', ')} column${missing.length > 1 ? 's' : ''}. Use the template to match supported headers.`);
  }
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const warnings: string[] = [];
  let skipped = 0;
  let future = 0;
  const cards = rows.slice(1).flatMap((row, rowIndex): Card[] => {
    const due = parseDate(row[map.dueDate] ?? '', dayStart);
    const front = (row[map.front] ?? '').trim();
    if (!due || !front) { skipped++; return []; }
    if (due.getTime() > dayStart.getTime()) { future++; return []; }
    const intervalDays = Math.max(1, Math.round(numeric(row[map.intervalDays], 1)));
    const lapses = Math.max(0, Math.round(numeric(row[map.lapses], 0)));
    const reviews = Math.max(0, Math.round(numeric(row[map.reviews], 0)));
    const daysOverdue = Math.max(0, Math.floor((dayStart.getTime() - due.getTime()) / 86400000));
    const risk = riskFor(daysOverdue, intervalDays, lapses, reviews);
    return [{
      id: `card-${rowIndex + 1}-${hash(front + due.toISOString())}`,
      deck: (row[map.deck] ?? 'Imported deck').trim() || 'Imported deck',
      front,
      back: (row[map.back] ?? '').trim(),
      dueDate: due.toISOString().slice(0, 10),
      intervalDays,
      ease: numeric(row[map.ease], 2.5),
      lapses,
      reviews,
      tags: (row[map.tags] ?? '').trim(),
      daysOverdue,
      ...risk,
    }];
  });
  if (skipped) warnings.push(`${skipped} row${skipped === 1 ? '' : 's'} skipped because Front or Due was invalid.`);
  if (future) warnings.push(`${future} not-yet-due card${future === 1 ? '' : 's'} left out of this recovery plan.`);
  if (!cards.length) throw new Error('No usable cards were found. Check that Front, Due, and Interval contain valid values.');
  if (map.lapses === undefined) warnings.push('No Lapses column: risk estimates use lateness and interval only.');
  return { cards, delimiter, warnings, detectedColumns: Object.keys(map) };
}

function hash(value: string): string {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return (result >>> 0).toString(36);
}

export function csvEscape(value: string | number): string {
  const string = String(value);
  return /[",\n\r]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
}
