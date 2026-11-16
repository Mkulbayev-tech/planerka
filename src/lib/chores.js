// Планёрка (макет, шаг 3): дела по дому — разовые, ежедневные, по дням недели и раз в месяц.
// Сами дела лежат в settings.chores, отметки — в settings.choreLog[choreId][ключ] = { d: 1|0, s: [номера подзадач], by }.
// Ключ — дата; у еженедельного дела с подзадачами — неделя («w:2026-11-16»): комнаты убирают в течение недели.
import { iso, parseIso, addDays } from './dates.js';

export const FREQS = [
  { id: 'once', label: 'Один раз' },
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
];
export const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const dow = dateIso => (parseIso(dateIso).getDay() + 6) % 7; // пн = 0
export const weekOf = dateIso => iso(addDays(parseIso(dateIso), -dow(dateIso)));
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

export const validChores = list => (Array.isArray(list) ? list : [])
  .filter(c => c && c.id && c.name && ['once', 'day', 'week', 'month'].includes(c.freq))
  .map(c => ({
    ...c,
    days: (Array.isArray(c.days) ? c.days : []).filter(x => x >= 0 && x <= 6),
    subs: (Array.isArray(c.subs) ? c.subs : []).map(x => String(x || '').trim()).filter(Boolean),
    day: Math.min(31, Math.max(1, Math.round(Number(c.day) || 1))),
    time: /^\d{2}:\d{2}$/.test(c.time || '') ? c.time : '',
  }));

export function occursOn(c, dateIso) {
  if (c.since && dateIso < c.since) return false;
  if (c.freq === 'once') return c.date === dateIso;
  if (c.freq === 'day') return true;
  if (c.freq === 'week') return c.days.includes(dow(dateIso));
  const d = parseIso(dateIso);
  return d.getDate() === Math.min(c.day, daysIn(d.getFullYear(), d.getMonth()));
}

export const unitKey = (c, dateIso) => (c.freq === 'week' && c.subs.length ? 'w:' + weekOf(dateIso) : dateIso);

// Кто делает: «вместе», конкретный человек или по очереди (неделя за неделей, у ежемесячных — месяц за месяцем)
export function assigneeOf(c, dateIso, memberIds) {
  if (c.who === 'together') return 'together';
  if (!c.rotate || memberIds.length < 2) return c.who || null;
  const base = Math.max(0, memberIds.indexOf(c.who));
  const from = c.since || c.date || dateIso;
  let n;
  if (c.freq === 'month') {
    const a = parseIso(from);
    const b = parseIso(dateIso);
    n = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  } else {
    n = Math.round((parseIso(weekOf(dateIso)) - parseIso(weekOf(from))) / (7 * 86400000));
  }
  return memberIds[(base + Math.max(0, n)) % memberIds.length];
}

export function stateOf(c, log, dateIso) {
  const e = ((log && log[c.id]) || {})[unitKey(c, dateIso)] || null;
  const subsDone = c.subs.length ? (e && Array.isArray(e.s) ? e.s.filter(i => i >= 0 && i < c.subs.length) : []) : [];
  const done = c.subs.length ? subsDone.length === c.subs.length : !!(e && e.d);
  return { done, subsDone, by: e ? e.by || null : null };
}

// Новая запись отметки: sub — номер подзадачи; без него — отметить или снять целиком
export function toggled(c, entry, sub, by) {
  const e = { ...(entry || {}) };
  if (c.subs.length) {
    const cur = new Set(Array.isArray(e.s) ? e.s : []);
    if (sub === undefined) { if (cur.size === c.subs.length) cur.clear(); else c.subs.forEach((_, i) => cur.add(i)); }
    else if (cur.has(sub)) cur.delete(sub); else cur.add(sub);
    e.s = [...cur].sort((a, b) => a - b);
    e.d = e.s.length === c.subs.length ? 1 : 0;
  } else e.d = e.d ? 0 : 1;
  e.by = by;
  return e.d || (e.s && e.s.length) ? e : null;
}

// Отметки старше 70 дней не нужны ни одному экрану
export function pruneLog(entries, todayIso) {
  const edge = iso(addDays(parseIso(todayIso), -70));
  return Object.fromEntries(Object.entries(entries || {}).filter(([k]) => (k.startsWith('w:') ? k.slice(2) : k) >= edge));
}

export function repeatLabel(c) {
  if (c.freq === 'day') return 'каждый день';
  if (c.freq === 'month') return `каждый месяц ${c.day}-го`;
  if (c.freq === 'once') return '';
  const d = [...c.days].sort((a, b) => a - b);
  if (d.length === 7) return 'каждый день';
  if (d.join() === '0,1,2,3,4') return 'по будням';
  if (d.join() === '5,6') return 'по выходным';
  return d.map(i => WD[i]).join(', ');
}
