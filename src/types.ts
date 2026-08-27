export interface Card {
  id: string;
  deck: string;
  front: string;
  back: string;
  dueDate: string;
  intervalDays: number;
  ease: number;
  lapses: number;
  reviews: number;
  tags: string;
  daysOverdue: number;
  risk: number;
  riskBand: 'high' | 'watch' | 'stable';
  riskReasons: string[];
}

export type PlanKind = 'protect' | 'balanced' | 'clear';

export interface DaySchedule {
  day: number;
  date: string;
  cards: number;
  minutes: number;
  highRisk: number;
  remaining: number;
}

export interface RecoveryPlan {
  kind: PlanKind;
  name: string;
  kicker: string;
  description: string;
  dailyCards: number;
  dailyMinutes: number;
  projectedDays: number;
  deadlineMet: boolean;
  cardsByDeadline: number;
  highRiskByDay3: number;
  schedule: DaySchedule[];
}

export interface Settings {
  dailyMinutes: number;
  deadline: string;
  secondsPerCard: number;
}

export interface CheckIn {
  date: string;
  reviewed: number;
}

export interface AppState {
  version: 1;
  importedAt: string;
  sourceName: string;
  cards: Card[];
  settings: Settings;
  selectedPlan: PlanKind;
  checkIns: CheckIn[];
}

export interface ParseResult {
  cards: Card[];
  delimiter: ',' | '\t' | ';';
  warnings: string[];
  detectedColumns: string[];
}
