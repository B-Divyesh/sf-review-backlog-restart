import './style.css';
import { csvEscape, parseAnkiCsv } from './csv';
import { assignCards, simulatePlans } from './plans';
import { clearState, loadState, saveState } from './store';
import { cardNoun } from './format';
import type { AppState, Card, PlanKind, RecoveryPlan, Settings } from './types';

const SAMPLE = `Deck,Front,Back,Due,Interval,Lapses,Reviews,Tags
Spanish::Core,la cosecha,the harvest,2026-07-04,14,2,18,noun
Spanish::Core,acordarse,to remember,2026-08-01,5,4,12,verb
Spanish::Listening,¿A qué hora?,At what time?,2026-08-18,2,1,4,phrase
Biology,mitochondrial matrix,space inside the inner membrane,2026-06-28,31,1,22,cell
Biology,allosteric site,regulatory binding site,2026-08-23,3,3,8,enzyme
Geography,Salar de Uyuni,salt flat in Bolivia,2026-07-20,20,0,9,place`;

let state: AppState | null = null;
let plans: RecoveryPlan[] = [];
let lastWarnings: string[] = [];
// A route choice changes the exported order. Keep the export unavailable until
// that choice has reached IndexedDB so a fast follow-up click cannot export a
// transient route or reload before the selected route is durable.
let routeSaveInFlight = false;
const app = document.querySelector<HTMLDivElement>('#app') as HTMLDivElement;
if (!app) throw new Error('App root was not found.');

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

function header(): string {
  return `<header class="site-header"><a class="brand" href="#top" aria-label="Review Backlog Restart home"><span class="brand-mark" aria-hidden="true">R/</span><span>Backlog Restart</span></a><nav aria-label="Utility"><span class="privacy-note">${icon('shield')} Stays on this device</span>${state ? '<button class="quiet-button" data-action="export-json">Export data</button><button class="quiet-button" data-action="reset">Start over</button>' : '<a href="#how">How it works</a>'}</nav></header>`;
}

function hero(): string {
  return `<section class="hero" id="top"><div class="hero-copy"><p class="eyebrow">A field guide back to your deck</p><h1>Your backlog is not a moral emergency.</h1><p class="hero-lede">Bring your overdue cards. Leave with a risk-aware plan that fits the time you actually have—without resetting a thing.</p><div class="hero-actions"><button class="button primary" data-action="open-file">${icon('upload')} Bring in your cards</button><button class="text-button" data-action="sample">Try the sample deck <span aria-hidden="true">→</span></button></div><p class="microcopy">CSV or TSV · read-only · processed locally</p></div><figure class="hero-art"><picture><source media="(max-width: 600px)" srcset="/assets/recovery-conservatory-640.webp"><img src="/assets/recovery-conservatory-960.webp" srcset="/assets/recovery-conservatory-640.webp 640w, /assets/recovery-conservatory-960.webp 960w, /assets/recovery-conservatory-1440.webp 1440w" sizes="(max-width: 800px) 92vw, 56vw" width="1440" height="960" fetchpriority="high" decoding="async" alt="A moonlit paper conservatory where card-like leaves cross an amber bridge toward a warm study table." /></picture><figcaption>There is a path through. It does not have to happen tonight.</figcaption></figure></section>`;
}

function importPanel(): string {
  return `<section class="import-section" id="main" aria-labelledby="import-title"><div class="section-index">01 / Bring cards</div><div class="import-copy"><h2 id="import-title">See what you’re carrying.</h2><p>Export a spreadsheet with card scheduling fields. We inspect it here—never upload it.</p><details><summary>Which export works?</summary><p>Use a CSV or TSV with headers for <strong>Front</strong>, <strong>Due</strong>, and <strong>Interval</strong>. Deck, Back, Lapses, Reviews, Ease, and Tags improve the plan but are optional.</p><button class="text-button inline" data-action="template">Download a matching template</button></details></div><div class="drop-zone" data-drop-zone><input class="visually-hidden" type="file" id="card-file" aria-label="Choose Anki CSV or TSV file" accept=".csv,.tsv,text/csv,text/tab-separated-values" /><span class="drop-icon">${icon('leaf')}</span><strong>Drop your Anki export here</strong><span>or <button class="file-link" data-action="open-file">choose a file</button></span><small>Nothing leaves this browser.</small></div><div class="restore-row"><span>Already made a plan?</span><button class="text-button inline" data-action="restore">Restore a Backlog Restart JSON file</button><input class="visually-hidden" id="restore-file" type="file" aria-label="Choose Backlog Restart JSON file" accept="application/json,.json" /></div></section>`;
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
  return `<section class="workspace-section pace-section" aria-labelledby="pace-title"><div class="section-index">02 / Set your pace</div><div class="section-heading"><div><h2 id="pace-title">Name an honest limit.</h2><p>This is a ceiling, not a challenge.</p></div>${stats(state.cards)}</div>${lastWarnings.length ? `<div class="notice warning" role="status">${icon('warning')}<div><strong>Imported with a note</strong>${lastWarnings.map((warning) => `<p>${e(warning)}</p>`).join('')}</div></div>` : ''}<form id="settings-form" class="settings-form"><label><span>Minutes available each day</span><span class="input-shell">${icon('clock')}<input name="dailyMinutes" type="number" min="5" max="240" step="5" required value="${state.settings.dailyMinutes}" /><small>minutes</small></span></label><label><span>Hope to be clear by</span><span class="input-shell"><input name="deadline" type="date" min="${today}" max="${max}" required value="${e(state.settings.deadline)}" /></span></label><label><span>Your usual pace</span><span class="input-shell"><input name="secondsPerCard" type="number" min="5" max="180" required value="${state.settings.secondsPerCard}" /><small>sec / card</small></span></label><button class="button primary calculate" type="submit">${icon('route')} Recalculate routes</button></form><p class="estimate-note">We estimate workload from your pace. Memory risk uses lateness, interval, and lapses—not a retention prediction.</p></section>`;
}

function planCard(plan: RecoveryPlan): string {
  const selected = state?.selectedPlan === plan.kind;
  const highTotal = state?.cards.filter((card) => card.riskBand === 'high').length ?? 0;
  const deadlineLine = plan.deadlineMet
    ? `<span class="status success">${icon('check')} On target</span>`
    : `<span class="status caution">${icon('warning')} ${plan.cardsByDeadline} of ${state?.cards.length} by date</span>`;
  return `<label class="plan-card ${selected ? 'selected' : ''}" data-kind="${plan.kind}"><input type="radio" name="plan" value="${plan.kind}" ${selected ? 'checked' : ''} ${routeSaveInFlight ? 'disabled' : ''} /><span class="plan-kicker">${e(plan.kicker)}</span><strong class="plan-name">${e(plan.name)}</strong><span class="plan-description">${e(plan.description)}</span><span class="plan-load"><b>${plan.dailyCards}</b> ${cardNoun(plan.dailyCards)} / day <small>≈ ${plan.dailyMinutes} min</small></span><span class="plan-metrics"><span><b>${plan.projectedDays}</b> days projected</span><span><b>${plan.highRiskByDay3}/${highTotal}</b> high-risk by day 3</span></span>${deadlineLine}<span class="radio-mark" aria-hidden="true"></span></label>`;
}

function planSection(): string {
  if (!state) return '';
  const selected = plans.find((plan) => plan.kind === state?.selectedPlan) ?? plans[1];
  const dates = selected.schedule.slice(0, 7);
  const savingNote = routeSaveInFlight ? '<p class="persistence-note" id="route-save-note" role="status">Saving your route choice locally…</p>' : '';
  return `<section class="workspace-section routes-section" aria-labelledby="routes-title" aria-busy="${routeSaveInFlight}"><div class="section-index">03 / Choose a route</div><div class="section-heading"><div><h2 id="routes-title">Three honest ways through.</h2><p>Every route respects your daily time box. “Clear by date” will say when the math does not fit.</p></div><span class="estimate-stamp">Estimates, not guarantees</span></div><fieldset class="plan-grid"><legend class="visually-hidden">Choose a recovery route</legend>${plans.map(planCard).join('')}</fieldset>${savingNote}<div class="selected-detail"><div><p class="eyebrow">First seven days · ${e(selected.name)}</p><h3>A small bridge, day by day.</h3><div class="week-strip" role="list" aria-label="First seven scheduled days">${dates.map((day) => `<div role="listitem"><time datetime="${day.date}">${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`))}</time><strong>${day.cards}</strong><span>cards</span><small>${day.highRisk} high-risk</small></div>`).join('')}${dates.length < 7 ? `<div class="clear-marker" role="listitem">${icon('leaf')}<strong>Clear</strong><span>after ${selected.projectedDays} day${selected.projectedDays === 1 ? '' : 's'}</span></div>` : ''}</div></div><div class="route-note"><strong>Why this ordering?</strong><p>${selected.kind === 'protect' ? 'Fragile cards come first: longer relative delay, more lapses, and younger intervals raise priority.' : selected.kind === 'balanced' ? 'Urgent cards lead, with overdue easier cards mixed in to keep visible progress.' : 'Short-interval cards lead so the list clears within the available capacity.'}</p><button class="text-button inline" data-action="method">Read the scoring note</button></div></div></section>`;
}

function riskSection(): string {
  if (!state) return '';
  const selected = plans.find((plan) => plan.kind === state?.selectedPlan) ?? plans[1];
  const assigned = assignCards(state.cards, selected);
  const top = assigned.slice(0, 8);
  return `<section class="workspace-section action-section" aria-labelledby="action-title"><div class="section-index">04 / Carry the list back</div><div class="section-heading"><div><h2 id="action-title">Your next cards, with reasons.</h2><p>The exported list adds action tags. It never writes to or reschedules your collection.</p></div><button class="button primary" data-action="export-csv" ${routeSaveInFlight ? 'disabled aria-describedby="route-save-note"' : ''}>${icon('download')} Export tagged action list</button></div><div class="table-wrap" tabindex="0" aria-label="Scrollable priority card table"><table><thead><tr><th>Day</th><th>Card</th><th>Why it’s here</th><th>Risk estimate</th></tr></thead><tbody>${top.map((card) => `<tr><td><span class="day-tag">Day ${card.actionDay}</span></td><td><strong>${e(stripHtml(card.front).slice(0, 90))}</strong><small>${e(card.deck)}</small></td><td>${card.riskReasons.map((reason) => `<span class="reason">${e(reason)}</span>`).join('')}</td><td><span class="risk ${card.riskBand}"><progress aria-label="Relative risk score ${card.risk} out of 100" max="100" value="${card.risk}"></progress><b>${card.risk}</b> / 100 · ${card.riskBand}</span></td></tr>`).join('')}</tbody></table></div><p class="table-caption">Showing the first 8 of ${state.cards.length} cards in this route. Scores compare cards in this import; they do not estimate recall probability.</p>${checkInPanel(selected)}</section>`;
}

function checkInPanel(plan: RecoveryPlan): string {
  if (!state) return '';
  const today = new Date().toISOString().slice(0, 10);
  const existing = state.checkIns.find((item) => item.date === today);
  const total = state.checkIns.reduce((sum, item) => sum + item.reviewed, 0);
  const remaining = Math.max(0, state.cards.length - total);
  return `<div class="checkin"><div><p class="eyebrow">Optional daily marker</p><h3>${existing ? 'Today is recorded.' : 'Close the loop for today.'}</h3><p>${existing ? `${existing.reviewed} cards logged on this device. ${remaining} remain in the original backlog estimate.` : 'After studying in Anki, record the count here. This does not alter either deck.'}</p></div>${existing ? `<button class="button secondary" data-action="undo-checkin">Undo today’s marker</button>` : `<form id="checkin-form"><label><span class="visually-hidden">Cards reviewed today</span><input name="reviewed" type="number" min="1" max="${state.cards.length}" value="${Math.min(plan.dailyCards, state.cards.length)}" required /></label><button class="button secondary" type="submit">${icon('check')} Record today</button></form>`}</div>`;
}

function howItWorks(): string {
  return `<section class="how" id="how" aria-labelledby="how-title"><p class="eyebrow">No scheduler tricks</p><h2 id="how-title">What this companion does—and doesn’t.</h2><div class="principles"><article><span>01</span><h3>Reads a copy</h3><p>Your export is read locally. Original scheduling fields are never changed.</p></article><article><span>02</span><h3>Shows the tradeoff</h3><p>Three routes expose how time, deadline, and fragile cards pull against each other.</p></article><article><span>03</span><h3>Returns an action list</h3><p>Export priorities and suggested tags, then decide what to do in Anki.</p></article></div></section>`;
}

function footer(): string {
  return `<footer><div><span class="brand-mark" aria-hidden="true">R/</span><p>Made for the moment when quitting feels easier than returning.</p></div><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-review-backlog-restart" rel="noopener">Source</a></nav><p class="generated-note">Hero artwork was generated for this product. No study data was used.</p></footer>`;
}

function render(): void {
  plans = state ? simulatePlans(state.cards, state.settings) : [];
  app.innerHTML = `${header()}<main>${hero()}${state ? `<div class="workspace" id="main"><div class="saved-banner" role="status">${icon('check')} <span><strong>${e(state.sourceName)}</strong> is stored locally · imported ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(state.importedAt))}</span><button class="text-button inline" data-action="replace">Replace file</button></div>${settingsSection()}${planSection()}${riskSection()}</div>` : importPanel()}${howItWorks()}<input class="visually-hidden" id="replace-file" type="file" aria-label="Choose replacement Anki CSV or TSV file" accept=".csv,.tsv,text/csv,text/tab-separated-values" /></main>${footer()}<div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div><dialog id="dialog"><div class="dialog-content"></div></dialog>`;
  bindEvents();
}

function bindEvents(): void {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => element.addEventListener('click', onAction));
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

async function onAction(event: Event): Promise<void> {
  const action = (event.currentTarget as HTMLElement).dataset.action;
  if (action === 'open-file') app.querySelector<HTMLInputElement>(state ? '#replace-file' : '#card-file')?.click();
  if (action === 'replace') app.querySelector<HTMLInputElement>('#replace-file')?.click();
  if (action === 'restore') app.querySelector<HTMLInputElement>('#restore-file')?.click();
  if (action === 'sample') await importText(SAMPLE, 'Sample return deck.csv');
  if (action === 'template') download('backlog-restart-template.csv', `Deck,Front,Back,Due,Interval,Lapses,Reviews,Ease,Tags\nLanguage,example front,example back,2026-08-20,7,2,12,2.5,example\n`, 'text/csv');
  if (action === 'export-csv') exportCsv();
  if (action === 'export-json' && state) download(`backlog-restart-${dateSlug()}.json`, JSON.stringify(state, null, 2), 'application/json');
  if (action === 'reset') confirmReset();
  if (action === 'method') showMethod();
  if (action === 'undo-checkin' && state) { state.checkIns = state.checkIns.filter((entry) => entry.date !== dateSlug()); await persist('Today’s marker removed.'); render(); }
}

function importFile(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) void handleCsv(file);
}

async function handleCsv(file: File): Promise<void> {
  if (file.size > 25 * 1024 * 1024) { showToast('That file is over 25 MB. Export only the due deck and try again.', 'error'); return; }
  try { await importText(await file.text(), file.name); }
  catch { showToast('We could not read that file. Save it as UTF-8 CSV or TSV and try again.', 'error'); }
}

async function importText(text: string, sourceName: string): Promise<void> {
  try {
    const result = parseAnkiCsv(text);
    const deadline = new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);
    state = { version: 1, importedAt: new Date().toISOString(), sourceName, cards: result.cards, settings: { dailyMinutes: 25, deadline, secondsPerCard: 18 }, selectedPlan: 'balanced', checkIns: [] };
    lastWarnings = result.warnings;
    await saveState(state);
    render();
    document.querySelector('#main')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
    showToast(`${result.cards.length} due cards are ready to plan.`);
  } catch (error) { showToast(error instanceof Error ? error.message : 'This file could not be imported.', 'error'); }
}

async function restoreFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as Partial<AppState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.cards) || !parsed.settings || !parsed.selectedPlan) throw new Error('Not a Backlog Restart data file.');
    state = parsed as AppState;
    await saveState(state);
    render();
    showToast('Your saved plan is back.');
  } catch (error) { showToast(error instanceof Error ? error.message : 'That JSON file could not be restored.', 'error'); }
}

async function updateSettings(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state) return;
  const data = new FormData(event.currentTarget as HTMLFormElement);
  const settings: Settings = { dailyMinutes: Number(data.get('dailyMinutes')), deadline: String(data.get('deadline')), secondsPerCard: Number(data.get('secondsPerCard')) };
  if (settings.dailyMinutes < 5 || settings.secondsPerCard < 5 || !settings.deadline) return;
  state.settings = settings;
  await persist('Routes recalculated.');
  render();
  document.querySelector('#routes-title')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

async function selectPlan(event: Event): Promise<void> {
  if (!state || routeSaveInFlight) return;
  const previousPlan = state.selectedPlan;
  state.selectedPlan = (event.currentTarget as HTMLInputElement).value as PlanKind;
  routeSaveInFlight = true;
  render();
  let saved = false;
  try {
    await saveState(state);
    saved = true;
  } catch {
  } finally {
    routeSaveInFlight = false;
  }
  if (!saved) {
    state.selectedPlan = previousPlan;
    render();
    showToast('Your route could not be saved locally. Try selecting it again.', 'error');
    return;
  }
  render();
  document.querySelector('#routes-title')?.scrollIntoView({ block: 'start' });
  showToast(`${plans.find((plan) => plan.kind === state?.selectedPlan)?.name ?? 'Route'} selected.`);
}

async function saveCheckIn(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state) return;
  const reviewed = Number(new FormData(event.currentTarget as HTMLFormElement).get('reviewed'));
  state.checkIns = [...state.checkIns.filter((item) => item.date !== dateSlug()), { date: dateSlug(), reviewed }];
  await persist(`${reviewed} cards recorded for today.`);
  render();
}

async function persist(message: string): Promise<void> {
  if (!state) return;
  await saveState(state);
  showToast(message);
}

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
  const dialog = app.querySelector<HTMLDialogElement>('#dialog');
  const content = dialog?.querySelector<HTMLElement>('.dialog-content');
  if (!dialog || !content) return;
  content.innerHTML = `<button class="dialog-close" aria-label="Close dialog">×</button><p class="eyebrow">Delete local plan</p><h2>Remove this import from this browser?</h2><p>This deletes ${state?.cards.length ?? 0} imported cards, settings, and check-ins stored here. Export JSON first if you want a restorable copy.</p><div class="dialog-actions"><button class="button secondary" data-dialog="cancel">Keep my plan</button><button class="button danger" data-dialog="confirm">Delete local data</button></div>`;
  content.querySelector('[data-dialog="cancel"]')?.addEventListener('click', () => dialog.close());
  content.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
  content.querySelector('[data-dialog="confirm"]')?.addEventListener('click', async () => { await clearState(); state = null; lastWarnings = []; dialog.close(); render(); showToast('Local plan deleted.'); });
  dialog.showModal();
}

function showMethod(): void {
  const dialog = app.querySelector<HTMLDialogElement>('#dialog');
  const content = dialog?.querySelector<HTMLElement>('.dialog-content');
  if (!dialog || !content) return;
  content.innerHTML = `<button class="dialog-close" aria-label="Close dialog">×</button><p class="eyebrow">Transparent estimate</p><h2>How priority is scored</h2><p>We compare each card using four imported facts: days overdue, delay relative to its prior interval, past lapses, and whether the interval is still young.</p><ul><li>Lateness contributes up to 52 points.</li><li>Delay relative to interval contributes up to 25.</li><li>Lapses contribute up to 18.</li><li>Young or unseen material adds a small caution.</li></ul><p>A score of 65+ is labeled high-risk. This is a triage heuristic, not FSRS, recall probability, or a retention guarantee.</p><button class="button secondary" data-dialog="cancel">Close scoring note</button>`;
  content.querySelector('[data-dialog="cancel"]')?.addEventListener('click', () => dialog.close());
  content.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
  dialog.showModal();
}

function showToast(message: string, tone: 'normal' | 'error' = 'normal'): void {
  const region = document.querySelector<HTMLElement>('#toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 5600);
}

function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stripHtml(value: string): string {
  const node = document.createElement('div');
  node.innerHTML = value;
  return node.textContent ?? '';
}

function dateSlug(): string { return new Date().toISOString().slice(0, 10); }
function reducedMotion(): boolean { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

function watchConnectivity(): void {
  const update = (offline: boolean) => {
    document.querySelector('.offline-pill')?.remove();
    if (offline) {
      const pill = document.createElement('div');
      pill.className = 'offline-pill'; pill.setAttribute('role', 'status');
      pill.textContent = 'Offline · your saved plan still works'; document.body.append(pill);
    }
  };
  const probe = async () => {
    if (!navigator.onLine) { update(true); return; }
    try {
      const response = await fetch(`${location.pathname}?connectivity=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
      update(!response.ok);
    } catch { update(true); }
  };
  addEventListener('online', () => void probe());
  addEventListener('offline', () => update(true));
  void probe();
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const registration = await navigator.serviceWorker.register('/sw.js');
  let refreshing = false;
  let updateRequested = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (updateRequested && !refreshing) { refreshing = true; location.reload(); } });
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'UPDATE_AVAILABLE') return;
    const region = document.querySelector<HTMLElement>('#toast-region');
    if (!region) return;
    const toast = document.createElement('div'); toast.className = 'toast update';
    toast.innerHTML = '<span>An updated field guide is ready.</span><button>Update now</button>';
    toast.querySelector('button')?.addEventListener('click', () => { updateRequested = true; registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); });
    region.append(toast);
  });
}

async function start(): Promise<void> {
  try { state = await loadState(); }
  catch { state = null; }
  render();
  watchConnectivity();
  await registerServiceWorker();
}

void start();
