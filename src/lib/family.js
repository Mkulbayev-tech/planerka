// Семейные разделы макета (шаг 5): меню и покупки, кредиты, коммуналка, календарь, итог месяца.
// Данные лежат в settings семьи (menu, shop, credits, utilities, events, debts, review) — чистые расчёты здесь.
import { iso, parseIso, addDays } from './dates.js';

export const SHOP_GROUPS = ['Мясо', 'Овощи и фрукты', 'Молочное', 'Бакалея', 'Хлеб', 'Для детей', 'Бытовое', 'Другое'];
export const EVENT_TYPES = [
  { id: 'doctor', label: 'Врачи' },
  { id: 'holiday', label: 'Праздники' },
  { id: 'kids', label: 'Садик и школа' },
  { id: 'other', label: 'Другое' },
];

const arr = x => (Array.isArray(x) ? x : []);
const num = x => Math.max(0, Number(x) || 0);

// ── Кредиты ────────────────────────────────────────────────────────────────
// left — осталось основного долга, rate — % годовых, monthly — платёж, total/paid — всего платежей и сколько внесено.
// Переплата — сколько ещё отдадим сверх остатка; досрочный платёж уменьшает срок при том же платеже.
export function creditView(c, todayIso) {
  const left = num(c.left);
  const monthly = num(c.monthly);
  const total = Math.max(0, Math.round(Number(c.total) || 0));
  const paid = Math.min(total, Math.max(0, Math.round(Number(c.paid) || 0)));
  const remainN = Math.max(0, total - paid);
  const overpay = Math.max(0, Math.round(monthly * remainN - left));
  const day = Math.min(28, Math.max(1, Math.round(Number(c.day) || 1)));
  const t = parseIso(todayIso);
  let next = new Date(t.getFullYear(), t.getMonth(), day);
  if (iso(next) < todayIso) next = new Date(t.getFullYear(), t.getMonth() + 1, day);
  // Досрочно: сколько сэкономим и на сколько месяцев раньше закроем (аннуитет, платёж прежний)
  const early = amount => {
    const i = num(c.rate) / 12 / 100;
    const P = Math.min(left, num(amount));
    if (!P || !monthly || !remainN) return null;
    const L2 = left - P;
    let n2;
    if (L2 <= 0) n2 = 0;
    else if (i > 0) {
      const x = 1 - i * L2 / monthly;
      if (x <= 0) return null;
      n2 = Math.ceil(-Math.log(x) / Math.log(1 + i));
    } else n2 = Math.ceil(L2 / monthly);
    n2 = Math.min(n2, remainN);
    const saved = Math.round(monthly * remainN - (P + monthly * n2));
    return { amount: P, saved: Math.max(0, saved), months: Math.max(0, remainN - n2) };
  };
  return { ...c, left, monthly, total, paid, remainN, overpay, day, nextIso: iso(next), pct: total ? Math.round(paid / total * 100) : 0, early };
}

// ── Коммуналка ─────────────────────────────────────────────────────────────
// meters: [{ id, name, unit, tariff, readings: [{ date, value }] }], fixed: [{ id, name, amount }], due — число оплаты
export function meterView(m) {
  const rs = arr(m.readings).filter(r => r && r.date && Number.isFinite(Number(r.value))).sort((a, b) => (a.date < b.date ? -1 : 1));
  const last = rs[rs.length - 1] || null;
  const prev = rs[rs.length - 2] || null;
  const delta = last && prev ? Math.max(0, Number(last.value) - Number(prev.value)) : 0;
  return { ...m, value: last ? Number(last.value) : null, lastDate: last ? last.date : null, delta, cost: Math.round(delta * num(m.tariff)), readings: rs };
}
export function utilitiesView(u, todayIso) {
  const meters = arr(u && u.meters).map(meterView);
  const fixed = arr(u && u.fixed).filter(f => f && f.name);
  const total = meters.reduce((s, m) => s + m.cost, 0) + fixed.reduce((s, f) => s + num(f.amount), 0);
  const due = Math.min(28, Math.max(1, Math.round(Number(u && u.due) || 25)));
  const t = parseIso(todayIso);
  // помесячно: расход по показаниям, снятым в этом месяце, + постоянные платежи
  const months = Array.from({ length: 6 }, (_, k) => new Date(t.getFullYear(), t.getMonth() - 5 + k, 1));
  const fixedSum = fixed.reduce((s, f) => s + num(f.amount), 0);
  const history = months.map(d => {
    const key = iso(d).slice(0, 7);
    let sum = 0;
    let any = false;
    meters.forEach(m => {
      m.readings.forEach((r, i) => {
        if (i === 0 || r.date.slice(0, 7) !== key) return;
        any = true;
        sum += Math.max(0, Number(r.value) - Number(m.readings[i - 1].value)) * num(m.tariff);
      });
    });
    return { key, month: d.getMonth(), value: any ? Math.round(sum + fixedSum) : 0 };
  });
  const prevVal = history[4].value;
  const curVal = history[5].value || total;
  return { meters, fixed, total, due, history, deltaPct: prevVal ? Math.round((curVal - prevVal) / prevVal * 100) : null };
}

// ── Меню → покупки ─────────────────────────────────────────────────────────
// menu[weekIso][0..6] = { dish, cook, need: [{ name, qty, group, price }] }
export const weekKey = dateIso => {
  const d = parseIso(dateIso);
  return iso(addDays(d, -((d.getDay() + 6) % 7)));
};
export function shoppingFromMenu(week, shopItems) {
  const have = new Set(arr(shopItems).filter(x => !x.done).map(x => String(x.name).trim().toLowerCase()));
  const add = [];
  Object.values(week || {}).forEach(day => {
    arr(day && day.need).forEach(n => {
      const key = String(n.name || '').trim().toLowerCase();
      if (!key) return;
      const same = add.find(x => x.name.trim().toLowerCase() === key);
      if (same) { if (day.dish && !same.note.includes(day.dish)) same.note += ', ' + day.dish.toLowerCase(); return; }
      if (have.has(key)) return;
      add.push({ name: n.name.trim(), qty: n.qty || '', group: n.group || 'Другое', price: num(n.price), note: day.dish ? day.dish.toLowerCase() : '' });
    });
  });
  return add;
}
