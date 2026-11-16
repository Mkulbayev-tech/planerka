// Регулярные платежи (кредит, связь, подписки…): лежат в settings.recurring и в свой день месяца
// сами превращаются в трату. id траты детерминированный (rec-<платёж>-<дата>), поэтому два телефона
// не создадут дубль, а дата попадает в done — удалённую вручную трату приложение не вернёт.
import { iso, parseIso, addDays } from './dates.js';

export const BILL_SUGGEST = ['Кредит', 'Рассрочка', 'Аренда', 'Коммунальные', 'Интернет', 'Мобильная связь', 'Подписки'];

export const billTxId = (billId, dateIso) => `rec-${billId}-${dateIso}`;

const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

// Даты платежа в [fromIso, toIso): число day, в коротком месяце — последний день месяца
export function billDates(day, fromIso, toIso) {
  const out = [];
  const from = parseIso(fromIso);
  let y = from.getFullYear();
  let m = from.getMonth();
  for (let i = 0; i < 36; i++) {
    const d = iso(new Date(y, m, Math.min(day, daysIn(y, m))));
    if (d >= toIso) break;
    if (d >= fromIso) out.push(d);
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

export const validBills = list => (Array.isArray(list) ? list : [])
  .filter(b => b && b.id && b.title && Number(b.amount) > 0 && Number(b.day) >= 1 && Number(b.day) <= 31)
  .map(b => ({ ...b, amount: Math.round(Number(b.amount)), day: Math.round(Number(b.day)), done: Array.isArray(b.done) ? b.done : [] }));

// Пора внести: дата наступила, не раньше дня добавления платежа и не старше 31 дня, трата ещё не создавалась
export function dueBills(bills, txIds, todayIso) {
  const from = iso(addDays(parseIso(todayIso), -31));
  const to = iso(addDays(parseIso(todayIso), 1));
  const rows = [];
  bills.forEach(b => {
    const start = b.since && b.since > from ? b.since : from;
    billDates(b.day, start, to).forEach(date => {
      const id = billTxId(b.id, date);
      if (txIds.has(id) || b.done.includes(date)) return;
      rows.push({ bill: b, date, id });
    });
  });
  return rows;
}

// Ближайшие даты платежей для напоминаний: с сегодняшнего дня на days вперёд
export function upcomingBills(bills, todayIso, days = 62) {
  const to = iso(addDays(parseIso(todayIso), days));
  return bills.flatMap(b => billDates(b.day, b.since && b.since > todayIso ? b.since : todayIso, to).map(date => ({ bill: b, date })))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
