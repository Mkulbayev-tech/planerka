// Фото чека → покупки. Текст распознаёт iPhone (Vision, плагин ReceiptOCR), здесь — разбор:
// куски текста собираются в строки, из строк достаются магазин, дата, позиции и итог.
import { guessCat } from './autoplan.js';
import { tidyTitle } from './statement.js';

// obs: [{ text, x, y, w, h }] — координаты 0..1, y сверху. Чек может быть снят с наклоном, поэтому кусок
// относится к строке, если его середина по высоте ближе половины высоты строки.
export function receiptRows(obs) {
  const items = (obs || []).filter(o => o && String(o.text || '').trim()).map(o => ({ ...o, cy: o.y + o.h / 2 }));
  if (!items.length) return [];
  const hs = items.map(o => o.h).sort((a, b) => a - b);
  const tol = hs[Math.floor(hs.length / 2)] * 0.6;
  const rows = [];
  items.sort((a, b) => a.cy - b.cy).forEach(o => {
    const row = rows.find(r => Math.abs(r.cy - o.cy) < tol);
    if (row) { row.parts.push(o); row.cy = row.parts.reduce((s, p) => s + p.cy, 0) / row.parts.length; } else rows.push({ cy: o.cy, parts: [o] });
  });
  return rows.sort((a, b) => a.cy - b.cy).map(r => r.parts.sort((a, b) => a.x - b.x).map(p => p.text.trim()).join('  '));
}

const AMOUNT_RE = /(\d{1,3}(?:[  ]\d{3})+|\d+)[.,](\d{2})\s*(?:₸|тг\.?|тнг|kzt)?\s*$/i;
const amountOf = line => { const m = AMOUNT_RE.exec(line); return m ? Number(m[1].replace(/[  ]/g, '') + '.' + m[2]) : null; };
const SKIP_RE = /бин|иин|чек|касс|смена|фп\b|рнм|кгд|огд|адрес|тел\.?|оплат|сдач|наличн|карт|безнал|спасибо|ндс|скидк|получено|внесено|сайт|www|qr|офд|зав\.|№/i;
const TOTAL_RE = /итог|к\s*оплате|всего|total/i;
const QTY_RE = /^\s*\d+[.,]?\d*\s*(?:шт\.?|кг|л|уп)?\s*[xх×*]\s*[\d  ]+(?:[.,]\d{1,2})?\s*$/i; // «2 x 620,00»

export function parseReceipt(lines) {
  const rows = (lines || []).map(l => String(l || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  let total = null;
  let totalIdx = -1;
  rows.forEach((l, i) => {
    if (!TOTAL_RE.test(l) || /ндс|скидк/i.test(l)) return;
    const a = amountOf(l);
    if (a !== null && (total === null || /итог/i.test(l))) { if (total === null || a >= total) { total = a; totalIdx = i; } }
  });
  let date = null;
  for (const l of rows) {
    const m = /(\d{2})[./-](\d{2})[./-](\d{4}|\d{2})\b/.exec(l);
    if (m && Number(m[2]) <= 12 && Number(m[1]) <= 31) { date = `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2]}-${m[1]}`; break; }
  }
  const storeLine = rows.find(l => /[a-zа-яё]{3,}/i.test(l) && !SKIP_RE.test(l) && amountOf(l) === null) || '';
  const store = tidyTitle(storeLine.replace(/^(TOO|ТОО|ИП|IP|АО)\s+/i, ''));

  // Позиции — строки до итога с названием и суммой в конце; «2 x 620,00  1 240,00» относится к названию строкой выше
  const items = [];
  let pendingName = '';
  (totalIdx >= 0 ? rows.slice(0, totalIdx) : rows).forEach(l => {
    const a = amountOf(l);
    const name = a === null ? l : l.replace(AMOUNT_RE, '').trim();
    if (SKIP_RE.test(l) || l === storeLine) { pendingName = ''; return; }
    if (a === null) { pendingName = /[a-zа-яё]{3,}/i.test(l) && !/\d{2}[./]\d{2}[./]\d{2,4}/.test(l) ? l : ''; return; }
    if (!name || QTY_RE.test(name)) { if (pendingName) items.push({ name: pendingName, sum: a }); pendingName = ''; return; }
    if (!/[a-zа-яё]{2,}/i.test(name)) { pendingName = ''; return; }
    items.push({ name, sum: a });
    pendingName = '';
  });
  const itemsSum = items.reduce((s, x) => s + x.sum, 0);
  if (total === null && items.length) total = itemsSum;
  // Позициям верим, только если они сходятся с итогом (иначе где-то слиплись количество и цена)
  const reliable = items.length > 0 && total !== null && Math.abs(itemsSum - total) <= Math.max(1, total * 0.01);
  return { store, date, total: total === null ? 0 : Math.round(total), items: items.map(x => ({ ...x, sum: Math.round(x.sum) })), reliable };
}

function hash(s) {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619);
  return (h1 >>> 0).toString(36);
}

/**
 * Чек → строки для импорта: по одной трате на категорию (позиции раскладываются по категориям),
 * а если позиции не сошлись с итогом — одна трата на весь чек.
 * ctx: { txs, cats, ns (id семьи), todayIso }
 */
export function receiptToRows(rc, ctx) {
  const { txs = [], cats = [], ns = '', todayIso } = ctx;
  const date = rc.date && rc.date <= todayIso ? rc.date : todayIso;
  const title = rc.store || 'Чек';
  const storeCat = guessCat(title, txs, cats) || 'food';
  const mk = (cat, amount, names) => ({
    id: 'imp-' + hash([ns, 'rc', date, title, rc.total, cat].join('|')), kind: 'tx', date, amount, title, cat,
    op: names.length ? `${names.length} поз.` : 'чек', note: names.slice(0, 4).join(', '), exists: false, likely: false, checked: true,
  });
  if (!rc.total) return [];
  if (!rc.reliable) return [mk(storeCat, rc.total, [])];
  const byCat = {};
  rc.items.forEach(it => { const c = guessCat(it.name, [], cats) || storeCat; (byCat[c] = byCat[c] || { sum: 0, names: [] }); byCat[c].sum += it.sum; byCat[c].names.push(it.name); });
  return Object.entries(byCat).map(([cat, v]) => mk(cat, v.sum, v.names)).sort((a, b) => b.amount - a.amount);
}
