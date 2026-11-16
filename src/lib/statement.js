// Импорт выписки: строки PDF Kaspi Gold или CSV → операции → кандидаты на добавление
// (с подобранной категорией и отметкой «уже есть в бюджете»). Без React и без pdf.js — их грузит lib/pdf.js.
import { guessCat } from './autoplan.js';

// ── Kaspi Gold: «01.11.24  - 5 000,00 ₸  Покупка  ИП MAGNUM» ───────────────────────────
const OPS = ['Покупка', 'Перевод', 'Пополнение', 'Снятие', 'Разное', 'Платеж', 'Платёж'];
const LINE_RE = /^(\d{2})\.(\d{2})\.(\d{2}|\d{4})\s+([+\-−–])\s*(\d[\d ]*(?:[.,]\d{1,2})?)\s*(?:₸|KZT|тг\.?)\s*(.*)$/i;

const clean = s => String(s || '').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
const toAmount = s => Math.round(Number(String(s).replace(/\s/g, '').replace(',', '.')) || 0);
const fullYear = y => (y.length === 2 ? '20' + y : y);

export function parseKaspiLines(lines) {
  const out = [];
  lines.map(clean).forEach(line => {
    const m = LINE_RE.exec(line);
    if (!m) return;
    const [, dd, mm, yy, sign, num, rest] = m;
    const amount = toAmount(num);
    if (!amount) return;
    const words = rest.split(' ');
    const op = OPS.find(o => o.toLowerCase() === (words[0] || '').toLowerCase()) || '';
    const details = clean(op ? words.slice(1).join(' ') : rest);
    out.push({ date: `${fullYear(yy)}-${mm}-${dd}`, amount, income: sign === '+', op: op.replace('Платёж', 'Платеж'), details });
  });
  return out;
}

// ── CSV: наш экспорт (Дата;Название;Категория;Способ;Сумма;Кто) или выгрузка банка ───────
function splitCsv(text) {
  const head = text.split(/\r?\n/).find(l => l.trim()) || '';
  const delim = [';', '\t', ','].map(d => [d, head.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some(c => c.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some(c => c.trim())) rows.push(row);
  return rows;
}
const parseDate = s => {
  const v = clean(s);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/.exec(v);
  if (m) return `${fullYear(m[3])}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
};

export function parseCsv(text) {
  const rows = splitCsv(String(text || '').replace(/^﻿/, ''));
  if (rows.length < 2) return [];
  const head = rows[0].map(h => clean(h).toLowerCase());
  const col = re => head.findIndex(h => re.test(h));
  const iDate = col(/дата|date/);
  const iAmount = col(/сумма|amount|сумм/);
  const iTitle = col(/название|описание|детали|назначение|контрагент|description|details|merchant/);
  const iOp = col(/операц|тип|type/);
  const iCat = col(/категори|category/);
  if (iDate < 0 || iAmount < 0) return [];
  // В нашем экспорте суммы трат положительные; в банковских выгрузках траты со знаком минус
  const ours = iCat >= 0;
  const out = [];
  rows.slice(1).forEach(r => {
    const date = parseDate(r[iDate]);
    const raw = clean(r[iAmount]).replace(/[−–]/g, '-').replace(/[^\d,.\-+]/g, '');
    const value = Number(raw.replace(/\s/g, '').replace(',', '.'));
    if (!date || !Number.isFinite(value) || !value) return;
    const op = iOp >= 0 ? clean(r[iOp]) : '';
    out.push({
      date, amount: Math.round(Math.abs(value)), income: ours ? false : value > 0,
      op, details: clean(iTitle >= 0 ? r[iTitle] : op), catName: iCat >= 0 ? clean(r[iCat]) : '',
    });
  });
  return out;
}

// ── Кандидаты на импорт ─────────────────────────────────────────────────────
const norm = s => clean(s).toLowerCase().replace(/ё/g, 'е');
// «ИП MAGNUM CASH&CARRY» → «MAGNUM CASH&CARRY»
export const tidyTitle = s => clean(String(s || '').replace(/^(ип|тоо|too|ао|llp|ip)\s+/i, '').replace(/[«»"]/g, '')).slice(0, 60);

function hash(s) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822519);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

/**
 * items — из parseKaspiLines / parseCsv; ctx: { txs, incomes, cats (видимые), allCats, ns (id семьи) }
 * Возвращает { rows, skipped }: строки для экрана импорта (kind 'tx' | 'income', checked, cat, likely)
 * и сколько операций уже импортировано раньше.
 */
export function buildImport(items, ctx) {
  const { txs = [], incomes = [], cats = [], allCats = cats, ns = '' } = ctx;
  const ids = new Set([...txs.map(t => t.id), ...incomes.map(i => i.id)]);
  const sameDay = new Map();
  [...txs, ...incomes].forEach(t => { const k = t.date + '|' + t.amount; sameDay.set(k, (sameDay.get(k) || 0) + 1); });
  const seen = new Map();
  const byName = Object.fromEntries(allCats.map(c => [norm(c.name), c.id]));
  const all = items.map(it => {
    const title = tidyTitle(it.details) || it.op || (it.income ? 'Поступление' : 'Трата');
    const key = [it.date, it.amount, it.income ? '+' : '-', norm(it.details)].join('|');
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    const id = 'imp-' + hash(ns + '|' + key + '|' + n); // ns — id семьи: у другой семьи тот же чек даст другой id
    const kind = it.income ? 'income' : 'tx';
    const exists = ids.has(id);
    // Та же сумма в тот же день уже записана вручную — скорее всего, это она
    const dk = it.date + '|' + it.amount;
    const likely = !exists && (sameDay.get(dk) || 0) >= n;
    const op = (it.op || '').toLowerCase();
    const cat = kind === 'income' ? null : (it.catName && byName[norm(it.catName)]) || guessCat(title, txs, cats) || guessCat(it.details, txs, cats) || 'other';
    // Переводы и снятия могут быть между своими счетами, поступления — пополнения карты: их отмечает человек
    const checked = !exists && !likely && kind === 'tx' && op !== 'перевод' && op !== 'снятие';
    return { id, kind, date: it.date, amount: it.amount, title, op: it.op || '', cat, exists, likely, checked };
  });
  const rows = all.filter(r => !r.exists).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { rows, skipped: all.length - rows.length };
}
