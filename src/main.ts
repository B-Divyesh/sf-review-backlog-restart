import './style.css';
import { csvEscape, parseAnkiCsv } from './csv';
import { cardNoun } from './format';
import { assignCards, simulatePlans } from './plans';
import { SAMPLE_SOURCE_NAME, sampleCsv } from './sample';
import { clearState, loadState, saveState, type StorageNamespace } from './store';
import type { AppState, Card, PlanKind, RecoveryPlan, Settings } from './types';

const BUILD_ID = 'v1.1.0';
const SITE_ORIGIN = 'https://review-backlog-restart.sociobot.in';
let state: AppState | null = null;
let plans: RecoveryPlan[] = [];
let lastWarnings: string[] = [];
let demoMode = isDemoLocation();
let routeSaveInFlight = false;
const app = document.querySelector<HTMLDivElement>('#app') as HTMLDivElement;
if (!app) throw new Error('App root was not found.');

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element) || !event.target.closest('.skip-link')) return;
  event.preventDefault();
  document.querySelector<HTMLElement>('#main')?.focus();
  history.replaceState(history.state, '', '#main');
});

function e(value: string | number): string {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));
}

function icon(name: 'upload' | 'clock' | 'route' | 'download' | 'shield' | 'leaf' | 'warning' | 'check'): string {
  const paths = {
    upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3v-6a3 3 0 0 1 3-3"/>',
    download: '<path d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-5"/>',
    leaf: '<path d="M20 4C10 4 5 9 5 15c0 3 2 5 5 5 6 0 10-6 10-16zM5 20c2-5 6-8 11-11"/>',
    warning: '<path d="M12 3L2.5 20h19L12 3z"/><path d="M12 9v5m0 3h.01"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function isDemoLocation(): boolean {
  return location.pathname.replace(/\/+$/, '') === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
}

function storageNamespace(): StorageNamespace { return demoMode ? 'demo' : 'real'; }

function header(): string {
  return `<header class="site-header"><a class="brand" href="/" data-route="home" aria-label="Review Backlog Restart home"><span class="brand-mark" aria-hidden="true">R/</span><span>Backlog Restart</span></a><nav aria-label="Primary"><a href="/demo" data-route="demo">Try sample</a><a href="#how">How it works</a><a href="/privacy/">Privacy</a></nav></header>`;
}

function demoBanner(): string {
  if (!demoMode) return '';
  return `<aside class="demo-banner" role="status"><div><strong>Demo — sample data, nothing is saved with your real plan</strong><span>This 120-card example uses separate browser storage.</span></div><div><button class="text-button" data-action="reset-demo">Reset demo</button><button class="button secondary" data-action="leave-demo">Start for real</button></div></aside>`;
}

function hero(): string {
  const action = demoMode
    ? '<a class="button primary" href="#planner">Review the sample plan</a>'
    : `<button class="button primary" data-action="sample">${icon('leaf')} Try it with sample data</button><span class="action-note">Loads a 120-card demo in separate storage.</span>`;
  return `<section class="hero" id="top"><div class="hero-copy"><p class="eyebrow">Recovery plan for overdue review cards</p><h1 tabindex="-1">Plan an overdue review backlog</h1><p class="hero-lede">For spaced-repetition learners returning after a break who need a safe daily study plan.</p><div class="hero-actions">${action}</div><ul class="hero-facts" aria-label="Product facts"><li>${icon('shield')} Private: cards stay in this browser.</li><li>${icon('leaf')} Offline: works after the first visit.</li><li>${icon('check')} Free: no account needed.</li></ul></div><figure class="hero-art"><picture><source media="(max-width: 600px)" srcset="/assets/recovery-conservatory-640.webp"><img src="/assets/recovery-conservatory-960.webp" srcset="/assets/recovery-conservatory-640.webp 640w, /assets/recovery-conservatory-960.webp 960w, /assets/recovery-conservatory-1440.webp 1440w" sizes="(max-width: 800px) 92vw, 56vw" width="1440" height="960" fetchpriority="high" decoding="async" alt="A paper-card garden and footbridge leading to a warm study table, showing a calm return to study." /></picture><figcaption>Use a daily limit that leaves room for tomorrow.</figcaption></figure></section>`;
}

function importPanel(): string {
  return `<section class="import-section" id="import" aria-labelledby="import-title"><div class="section-index">01 / Import cards</div><div class="import-copy"><h2 id="import-title">Import an Anki CSV or TSV</h2><p>Choose an export with card scheduling fields. This app reads it in this browser.</p><details><summary>See supported columns</summary><p>Use headers for <strong>Front</strong>, <strong>Due</strong>, and <strong>Interval</strong>. Deck, Back, Lapses, Reviews, Ease, and Tags improve the plan but are optional.</p><button class="text-button inline" data-action="template">Download a matching template</button></details></div><div class="drop-zone" data-drop-zone><input class="visually-hidden" type="file" id="card-file" aria-label="Choose Anki CSV or TSV file" accept=".csv,.tsv,text/csv,text/tab-separated-values" /><span class="drop-icon">${icon('upload')}</span><strong>Drop your Anki export here</strong><span>or <button class="file-link" data-action="open-file">choose a file</button></span><small>Cards stay in this browser.</small></div><div class="restore-row"><span>Already saved a plan?</span><button class="text-button inline" data-action="restore">Restore a Backlog Restart JSON backup</button></div></section>`;
}

function stats(cards: Card[]): string {
  const high = cards.filter((card) => card.riskBand === 'high').length;
  const median = [...cards].sort((a, b) => a.daysOverdue - b.daysOverdue)[Math.floor(cards.length / 2)]?.daysOverdue ?? 0;
  const decks = new Set(cards.map((card) => card.deck)).size;
  return `<div class="stats" aria-label="Import summary"><div><strong>${cards.length}</strong><span>due cards</span></div><div><strong>${high}</strong><span>high-risk estimates</span></div><div><strong>${median}d</strong><span>median overdue</span></div><div><strong>${decks}</strong><span>deck${decks === 1 ? '' : 's'}</span></div></div>`;
}

function settingsSection(): string {
  if (!state) return '';
  const today = new Date().toISOString().slice(0, 10);
  const max = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  return `<section class="workspace-section pace-section" aria-labelledby="pace-title"><div class="section-index">02 / Set study time</div><div class="section-heading"><div><h2 id="pace-title">Set daily study time</h2><p>Choose a limit you can repeat tomorrow.</p></div>${stats(state.cards)}</div>${lastWarnings.length ? `<div class="notice warning" role="status">${icon('warning')}<div><strong>Import note</strong>${lastWarnings.map((warning) => `<p>${e(warning)}</p>`).join('')}</div></div>` : ''}<form id="settings-form" class="settings-form"><label><span>Minutes available each day</span><span class="input-shell">${icon('clock')}<input name="dailyMinutes" type="number" min="5" max="240" step="5" required value="${state.settings.dailyMinutes}" /><small>minutes</small></span></label><label><span>Target finish date</span><span class="input-shell"><input name="deadline" type="date" min="${today}" max="${max}" required value="${e(state.settings.deadline)}" /></span></label><label><span>Usual seconds per card</span><span class="input-shell"><input name="secondsPerCard" type="number" min="5" max="180" required value="${state.settings.secondsPerCard}" /><small>sec / card</small></span></label><button class="button primary calculate" type="submit">${icon('route')} Recalculate plans</button></form><p class="estimate-note">Workload is an estimate from your pace. Risk uses lateness, interval, and lapses. It does not predict retention.</p></section>`;
}

function planCard(plan: RecoveryPlan): string {
  const selected = state?.selectedPlan === plan.kind;
  const highTotal = state?.cards.filter((card) => card.riskBand === 'high').length ?? 0;
  const deadlineLine = plan.deadlineMet ? `<span class="status success">${icon('check')} On target</span>` : `<span class="status caution">${icon('warning')} ${plan.cardsByDeadline} of ${state?.cards.length} by date</span>`;
  return `<label class="plan-card ${selected ? 'selected' : ''}" data-kind="${plan.kind}"><input type="radio" name="plan" value="${plan.kind}" ${selected ? 'checked' : ''} ${routeSaveInFlight ? 'disabled' : ''} /><span class="plan-kicker">${e(plan.kicker)}</span><strong class="plan-name">${e(plan.name)}</strong><span class="plan-description">${e(plan.description)}</span><span class="plan-load"><b>${plan.dailyCards}</b> ${cardNoun(plan.dailyCards)} / day <small>≈ ${plan.dailyMinutes} min</small></span><span class="plan-metrics"><span><b>${plan.projectedDays}</b> days projected</span><span><b>${plan.highRiskByDay3}/${highTotal}</b> high-risk by day 3</span></span>${deadlineLine}<span class="radio-mark" aria-hidden="true"></span></label>`;
}

function planSection(): string {
  if (!state) return '';
  const selected = plans.find((plan) => plan.kind === state?.selectedPlan) ?? plans[1];
  const dates = selected.schedule.slice(0, 7);
  const savingNote = routeSaveInFlight ? '<p class="persistence-note" id="route-save-note" role="status">Saving your plan choice in this browser…</p>' : '';
  return `<section class="workspace-section routes-section" aria-labelledby="routes-title" aria-busy="${routeSaveInFlight}"><div class="section-index">03 / Compare plans</div><div class="section-heading"><div><h2 id="routes-title">Compare recovery plans</h2><p>Every plan stays inside your time limit. The deadline plan says when the math does not fit.</p></div><span class="estimate-stamp">Estimates, not guarantees</span></div><fieldset class="plan-grid"><legend class="visually-hidden">Choose a recovery plan</legend>${plans.map(planCard).join('')}</fieldset>${savingNote}<div class="selected-detail"><div><p class="eyebrow">First seven days · ${e(selected.name)}</p><h3>See the first seven days</h3><div class="week-strip" role="list" aria-label="First seven scheduled days">${dates.map((day) => `<div role="listitem"><time datetime="${day.date}">${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`))}</time><strong>${day.cards}</strong><span>cards</span><small>${day.highRisk} high-risk</small></div>`).join('')}${dates.length < 7 ? `<div class="clear-marker" role="listitem">${icon('leaf')}<strong>Clear</strong><span>after ${selected.projectedDays} day${selected.projectedDays === 1 ? '' : 's'}</span></div>` : ''}</div></div><div class="route-note"><strong>Why this plan orders cards this way</strong><p>${selected.kind === 'protect' ? 'Fragile cards come first: longer relative delay, more lapses, and younger intervals raise priority.' : selected.kind === 'balanced' ? 'Urgent cards lead, with overdue easier cards mixed in to keep visible progress.' : 'Short-interval cards lead so the list clears within the available capacity.'}</p><button class="text-button inline" data-action="method">Read how risk is scored</button></div></div></section>`;
}

function riskSection(): string {
  if (!state) return '';
  const selected = plans.find((plan) => plan.kind === state?.selectedPlan) ?? plans[1];
  const top = assignCards(state.cards, selected).slice(0, 8);
  return `<section class="workspace-section action-section" aria-labelledby="action-title"><div class="section-index">04 / Export actions</div><div class="section-heading"><div><h2 id="action-title">Review high-risk cards first</h2><p>The exported list adds action tags. It never writes to or reschedules your collection.</p></div><button class="button primary" data-action="export-csv" ${routeSaveInFlight ? 'disabled aria-describedby="route-save-note"' : ''}>${icon('download')} Export tagged action list</button></div><div class="table-wrap" tabindex="0" aria-label="Scrollable priority card table"><table><thead><tr><th>Day</th><th>Card</th><th>Why it is here</th><th>Risk estimate</th></tr></thead><tbody>${top.map((card) => `<tr><td><span class="day-tag">Day ${card.actionDay}</span></td><td><strong>${e(stripHtml(card.front).slice(0, 90))}</strong><small>${e(card.deck)}</small></td><td>${card.riskReasons.map((reason) => `<span class="reason">${e(reason)}</span>`).join('')}</td><td><span class="risk ${card.riskBand}"><progress aria-label="Relative risk score ${card.risk} out of 100" max="100" value="${card.risk}"></progress><b>${card.risk}</b> / 100 · ${card.riskBand}</span></td></tr>`).join('')}</tbody></table></div><p class="table-caption">Showing the first 8 of ${state.cards.length} cards in this plan. Scores compare cards in this import; they do not estimate recall probability.</p>${checkInPanel(selected)}</section>`;
}

function checkInPanel(plan: RecoveryPlan): string {
  if (!state) return '';
  const today = new Date().toISOString().slice(0, 10);
  const existing = state.checkIns.find((item) => item.date === today);
  const total = state.checkIns.reduce((sum, item) => sum + item.reviewed, 0);
  const remaining = Math.max(0, state.cards.length - total);
  return `<div class="checkin"><div><p class="eyebrow">Optional daily record</p><h3>${existing ? 'Today is recorded' : 'Record today’s reviews'}</h3><p>${existing ? `${existing.reviewed} cards recorded in this browser. ${remaining} remain in the original backlog estimate.` : 'After studying in Anki, record the count here. This does not alter your deck.'}</p></div>${existing ? `<button class="button secondary" data-action="undo-checkin">Undo today’s record</button>` : `<form id="checkin-form"><label><span class="visually-hidden">Cards reviewed today</span><input name="reviewed" type="number" min="1" max="${state.cards.length}" value="${Math.min(plan.dailyCards, state.cards.length)}" required /></label><button class="button secondary" type="submit">${icon('check')} Record today</button></form>`}</div>`;
}

function howItWorks(): string {
  return `<section class="how" id="how" aria-labelledby="how-title"><p class="eyebrow">How it works</p><h2 id="how-title">Make a recovery plan in three steps</h2><div class="principles"><article><span>01</span><h3>Import a copy</h3><p>Read a CSV or TSV export locally. Original scheduling fields stay unchanged.</p></article><article><span>02</span><h3>Set a daily limit</h3><p>Compare time, deadline, and high-risk cards before choosing a plan.</p></article><article><span>03</span><h3>Export an action list</h3><p>Download day and risk tags, then decide what to do in Anki.</p></article></div></section>`;
}

function footer(): string {
  return `<footer><div><span class="brand-mark" aria-hidden="true">R/</span><p>A free local planner for overdue review cards.</p></div><nav aria-label="Footer"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><p class="footer-meta">Built by Param Factory · ${BUILD_ID}</p><p class="generated-note">The conservatory artwork was generated for this product. No study data was used.</p></footer>`;
}

function savedWorkspace(): string {
  if (!state) return '';
  const label = demoMode ? 'Sample plan' : 'Saved plan';
  const controls = demoMode ? '<button class="text-button" data-action="export-json">Export JSON backup</button><button class="text-button" data-action="reset-demo">Reset demo</button><button class="text-button" data-action="restore">Restore JSON backup</button><button class="text-button" data-action="leave-demo">Start for real</button>' : '<button class="text-button" data-action="export-json">Export JSON backup</button><button class="text-button" data-action="restore">Restore JSON backup</button><button class="text-button" data-action="reset">Start over</button>';
  return `<div class="workspace" id="planner"><div class="saved-banner" role="status">${icon('check')} <span><strong>${label}:</strong> ${e(state.sourceName)} · ${state.cards.length} cards</span><div class="saved-actions">${controls}</div></div>${settingsSection()}${planSection()}${riskSection()}</div>`;
}

function render(): void {
  plans = state ? simulatePlans(state.cards, state.settings) : [];
  setRouteMetadata();
  app.innerHTML = `${header()}${demoBanner()}<main id="main" tabindex="-1">${hero()}${state ? savedWorkspace() : importPanel()}${howItWorks()}</main>${footer()}<input class="visually-hidden" id="replace-file" type="file" aria-label="Choose replacement Anki CSV or TSV file" accept=".csv,.tsv,text/csv,text/tab-separated-values" /><input class="visually-hidden" id="restore-file" type="file" aria-label="Choose Backlog Restart JSON backup" accept="application/json,.json" /><div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div><div id="route-announcer" class="visually-hidden" aria-live="polite" aria-atomic="true"></div><dialog id="dialog"><div class="dialog-content"></div></dialog>`;
  bindEvents();
}

function bindEvents(): void {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => element.addEventListener('click', onAction));
  app.querySelectorAll<HTMLElement>('[data-route]').forEach((element) => element.addEventListener('click', onRoute));
  app.querySelector<HTMLInputElement>('#card-file')?.addEventListener('change', importFile);
  app.querySelector<HTMLInputElement>('#replace-file')?.addEventListener('change', importFile);
  app.querySelector<HTMLInputElement>('#restore-file')?.addEventListener('change', restoreFile);
  app.querySelector<HTMLFormElement>('#settings-form')?.addEventListener('submit', updateSettings);
  app.querySelector<HTMLFormElement>('#checkin-form')?.addEventListener('submit', saveCheckIn);
  app.querySelectorAll<HTMLInputElement>('input[name="plan"]').forEach((input) => input.addEventListener('change', selectPlan));
  const drop = app.querySelector<HTMLElement>('[data-drop-zone]');
  if (drop) {
    ['dragenter', 'dragover'].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.remove('dragging'); }));
    drop.addEventListener('drop', (event) => { const file = event.dataTransfer?.files[0]; if (file) void handleCsv(file); });
  }
}

async function onRoute(event: Event): Promise<void> {
  event.preventDefault();
  const route = (event.currentTarget as HTMLElement).dataset.route;
  if (route === 'demo' && !demoMode) await enterDemo();
  if (route === 'home' && demoMode) await leaveDemo();
}

async function onAction(event: Event): Promise<void> {
  const action = (event.currentTarget as HTMLElement).dataset.action;
  if (action === 'open-file') app.querySelector<HTMLInputElement>(state ? '#replace-file' : '#card-file')?.click();
  if (action === 'restore') app.querySelector<HTMLInputElement>('#restore-file')?.click();
  if (action === 'sample') await enterDemo();
  if (action === 'reset-demo') await resetDemo();
  if (action === 'leave-demo') await leaveDemo();
  if (action === 'template') download('backlog-restart-template.csv', 'Deck,Front,Back,Due,Interval,Lapses,Reviews,Ease,Tags\nLanguage,example front,example back,2026-08-20,7,2,12,2.5,example\n', 'text/csv');
  if (action === 'export-csv') exportCsv();
  if (action === 'export-json' && state) download(`backlog-restart-${dateSlug()}.json`, JSON.stringify(state, null, 2), 'application/json');
  if (action === 'reset') confirmReset();
  if (action === 'method') showMethod();
  if (action === 'undo-checkin' && state) { state.checkIns = state.checkIns.filter((entry) => entry.date !== dateSlug()); await persist('Today’s record was removed.'); render(); }
}

function importFile(event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (file) void handleCsv(file); }

async function handleCsv(file: File): Promise<void> {
  if (file.size > 25 * 1024 * 1024) { showToast('That file is over 25 MB. Export only the due deck and try again.', 'error'); return; }
  try { await importText(await file.text(), file.name); } catch { showToast('We could not read that file. Save it as UTF-8 CSV or TSV and try again.', 'error'); }
}

function newState(text: string, sourceName: string): { next: AppState; warnings: string[] } {
  const result = parseAnkiCsv(text);
  const deadline = new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);
  return { next: { version: 1, importedAt: new Date().toISOString(), sourceName, cards: result.cards, settings: { dailyMinutes: 25, deadline, secondsPerCard: 18 }, selectedPlan: 'balanced', checkIns: [] }, warnings: result.warnings };
}

async function importText(text: string, sourceName: string): Promise<void> {
  try {
    const imported = newState(text, sourceName);
    state = imported.next; lastWarnings = imported.warnings;
    await saveState(state, storageNamespace()); render();
    document.querySelector('#planner')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
    showToast(`${state.cards.length} due cards are ready to plan.`);
  } catch (error) { showToast(error instanceof Error ? error.message : 'This file could not be imported.', 'error'); }
}

async function seedDemo(): Promise<void> {
  const imported = newState(sampleCsv(), SAMPLE_SOURCE_NAME);
  state = imported.next; lastWarnings = imported.warnings;
  await saveState(state, 'demo');
}

async function enterDemo(): Promise<void> {
  history.pushState({}, '', '/demo'); demoMode = true; state = await loadState('demo'); lastWarnings = [];
  if (!state) await seedDemo();
  render(); focusRoute('Demo loaded. Sample data is separate from your real plan.');
}

async function resetDemo(): Promise<void> { await clearState('demo'); await seedDemo(); render(); showToast('Demo reset to the 120-card sample.'); }

async function leaveDemo(): Promise<void> {
  await clearState('demo'); history.pushState({}, '', '/'); demoMode = false; state = await loadState('real'); lastWarnings = [];
  render(); focusRoute('Demo closed. Your real plan is unchanged.');
}

async function restoreFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as Partial<AppState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.cards) || !parsed.settings || !parsed.selectedPlan) throw new Error('invalid backup');
    state = parsed as AppState; lastWarnings = [];
    await saveState(state, storageNamespace()); render(); showToast('Your saved plan is back.');
  } catch { showToast('That file is not a valid Backlog Restart backup. Choose a JSON backup exported from this app.', 'error'); }
}

async function updateSettings(event: SubmitEvent): Promise<void> {
  event.preventDefault(); if (!state) return;
  const data = new FormData(event.currentTarget as HTMLFormElement);
  const settings: Settings = { dailyMinutes: Number(data.get('dailyMinutes')), deadline: String(data.get('deadline')), secondsPerCard: Number(data.get('secondsPerCard')) };
  if (settings.dailyMinutes < 5 || settings.secondsPerCard < 5 || !settings.deadline) return;
  state.settings = settings; await persist('Plans recalculated.'); render();
  document.querySelector('#routes-title')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

async function selectPlan(event: Event): Promise<void> {
  if (!state || routeSaveInFlight) return;
  const previousPlan = state.selectedPlan;
  state.selectedPlan = (event.currentTarget as HTMLInputElement).value as PlanKind;
  routeSaveInFlight = true; render();
  let saved = false;
  try { await saveState(state, storageNamespace()); saved = true; } catch { /* restore selection below */ } finally { routeSaveInFlight = false; }
  if (!saved) { state.selectedPlan = previousPlan; render(); showToast('Your plan choice could not be saved. Try selecting it again.', 'error'); return; }
  render(); document.querySelector('#routes-title')?.scrollIntoView({ block: 'start' });
  showToast(`${plans.find((plan) => plan.kind === state?.selectedPlan)?.name ?? 'Plan'} selected.`);
}

async function saveCheckIn(event: SubmitEvent): Promise<void> {
  event.preventDefault(); if (!state) return;
  const reviewed = Number(new FormData(event.currentTarget as HTMLFormElement).get('reviewed'));
  state.checkIns = [...state.checkIns.filter((item) => item.date !== dateSlug()), { date: dateSlug(), reviewed }];
  await persist(`${reviewed} cards recorded for today.`); render();
}

async function persist(message: string): Promise<void> { if (state) { await saveState(state, storageNamespace()); showToast(message); } }

function exportCsv(): void {
  if (!state) return;
  const plan = plans.find((item) => item.kind === state?.selectedPlan) ?? plans[1];
  const rows = assignCards(state.cards, plan);
  const headers = ['Action day', 'Action date', 'Suggested tags', 'Risk band', 'Risk score', 'Risk reasons', 'Deck', 'Front', 'Back', 'Original due', 'Interval', 'Lapses', 'Reviews', 'Original tags'];
  const body = rows.map((card) => [card.actionDay, card.actionDate, card.actionTag, card.riskBand, card.risk, card.riskReasons.join('; '), card.deck, card.front, card.back, card.dueDate, card.intervalDays, card.lapses, card.reviews, card.tags].map(csvEscape).join(','));
  download(`backlog-action-list-${dateSlug()}.csv`, `\uFEFF${headers.join(',')}\n${body.join('\n')}\n`, 'text/csv;charset=utf-8');
  showToast('Tagged action list exported. Your original file was not changed.');
}

function confirmReset(): void {
  const dialog = app.querySelector<HTMLDialogElement>('#dialog'); const content = dialog?.querySelector<HTMLElement>('.dialog-content');
  if (!dialog || !content) return;
  content.innerHTML = `<button class="dialog-close" aria-label="Close dialog">×</button><p class="eyebrow">Delete local plan</p><h2>Remove this plan from this browser?</h2><p>This deletes ${state?.cards.length ?? 0} imported cards, settings, and records stored here. Export JSON first if you want a restorable copy.</p><div class="dialog-actions"><button class="button secondary" data-dialog="cancel">Keep my plan</button><button class="button danger" data-dialog="confirm">Delete local plan</button></div>`;
  content.querySelector('[data-dialog="cancel"]')?.addEventListener('click', () => dialog.close());
  content.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
  content.querySelector('[data-dialog="confirm"]')?.addEventListener('click', async () => { await clearState('real'); state = null; lastWarnings = []; dialog.close(); render(); showToast('Local plan deleted.'); });
  dialog.showModal();
}

function showMethod(): void {
  const dialog = app.querySelector<HTMLDialogElement>('#dialog'); const content = dialog?.querySelector<HTMLElement>('.dialog-content');
  if (!dialog || !content) return;
  content.innerHTML = `<button class="dialog-close" aria-label="Close dialog">×</button><p class="eyebrow">Risk estimate</p><h2>How risk is scored</h2><p>We compare each card using four imported facts: days overdue, delay relative to its prior interval, past lapses, and whether the interval is still young.</p><ul><li>Lateness contributes up to 52 points.</li><li>Delay relative to interval contributes up to 25.</li><li>Lapses contribute up to 18.</li><li>Young or unseen material adds a small caution.</li></ul><p>A score of 65+ is labeled high-risk. This is a triage estimate, not FSRS, recall probability, or a retention guarantee.</p><button class="button secondary" data-dialog="cancel">Close risk details</button>`;
  content.querySelector('[data-dialog="cancel"]')?.addEventListener('click', () => dialog.close());
  content.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close()); dialog.showModal();
}

function showToast(message: string, tone: 'normal' | 'error' = 'normal'): void {
  const region = document.querySelector<HTMLElement>('#toast-region'); if (!region) return;
  const toast = document.createElement('div'); toast.className = `toast ${tone}`; toast.textContent = message; region.append(toast);
  window.setTimeout(() => toast.remove(), 5600);
}

function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stripHtml(value: string): string { const node = document.createElement('div'); node.innerHTML = value; return node.textContent ?? ''; }
function dateSlug(): string { return new Date().toISOString().slice(0, 10); }
function reducedMotion(): boolean { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

function setRouteMetadata(): void {
  document.title = demoMode ? 'Demo — Review Backlog Restart' : 'Review Backlog Restart — plan an overdue review backlog';
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `${SITE_ORIGIN}${demoMode ? '/demo' : '/'}`;
}

function focusRoute(message: string): void {
  app.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  const announcer = app.querySelector<HTMLElement>('#route-announcer'); if (announcer) announcer.textContent = message;
}

function watchConnectivity(): void {
  const update = (offline: boolean) => { document.querySelector('.offline-pill')?.remove(); if (offline) { const pill = document.createElement('div'); pill.className = 'offline-pill'; pill.setAttribute('role', 'status'); pill.textContent = 'Offline · your saved plan still works'; document.body.append(pill); } };
  const probe = async () => { if (!navigator.onLine) { update(true); return; } try { const response = await fetch(`${location.pathname}?connectivity=${Date.now()}`, { method: 'HEAD', cache: 'no-store' }); update(!response.ok); } catch { update(true); } };
  addEventListener('online', () => void probe()); addEventListener('offline', () => update(true)); void probe();
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const registration = await navigator.serviceWorker.register('/sw.js'); let refreshing = false; let updateRequested = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (updateRequested && !refreshing) { refreshing = true; location.reload(); } });
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'UPDATE_AVAILABLE') return;
    const region = document.querySelector<HTMLElement>('#toast-region'); if (!region) return;
    const toast = document.createElement('div'); toast.className = 'toast update'; toast.innerHTML = '<span>An app update is ready.</span><button>Update now</button>';
    toast.querySelector('button')?.addEventListener('click', () => { updateRequested = true; registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); }); region.append(toast);
  });
}

async function reconcileLocation(): Promise<void> {
  const nextDemo = isDemoLocation(); if (demoMode && !nextDemo) await clearState('demo');
  demoMode = nextDemo; state = await loadState(storageNamespace()); lastWarnings = [];
  if (demoMode && !state) await seedDemo(); render();
  focusRoute(demoMode ? 'Demo loaded. Sample data is separate from your real plan.' : 'Review Backlog Restart home.');
}

async function start(): Promise<void> {
  if (new URLSearchParams(location.search).get('demo') === '1' && location.pathname === '/') history.replaceState({}, '', '/demo');
  demoMode = isDemoLocation(); state = await loadState(storageNamespace()); if (demoMode && !state) await seedDemo();
  render(); watchConnectivity(); await registerServiceWorker();
}

addEventListener('popstate', () => { void reconcileLocation(); });
void start();
