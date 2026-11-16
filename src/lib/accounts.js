// Счета и валюты (макет, шаг 2a): Kaspi Gold, наличные, доллары… Счёт операции хранится в её поле method
// (id счёта; старые значения «card»/«cash» относятся к первому карточному и первому наличному счёту).
// Баланс счёта = указанный остаток (start на момент since) ± операции после этого момента, переводы и зарплаты.
import { fmt } from '../data.js';

export const CURRENCIES = [
  { id: 'KZT', sign: '₸', label: 'Тенге' },
  { id: 'USD', sign: '$', label: 'Доллар' },
  { id: 'EUR', sign: '€', label: 'Евро' },
  { id: 'RUB', sign: '₽', label: 'Рубль' },
];
export const ACC_KINDS = [
  { id: 'card', label: 'Карта' },
  { id: 'cash', label: 'Наличные' },
  { id: 'save', label: 'Накопления' },
];
// Курс задаётся вручную в «Счетах»; эти значения — только стартовые
export const DEFAULT_RATES = { USD: 520, EUR: 600, RUB: 6.5 };

export const signOf = cur => (CURRENCIES.find(c => c.id === cur) || CURRENCIES[0]).sign;
const group = n => {
  const [a, b] = String(Math.round(n * 100) / 100).split('.');
  return a.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (b ? ',' + b.padEnd(2, '0') : '');
};
export const money = (n, cur) => (cur === 'KZT' || !cur ? fmt(n) : `${group(n)} ${signOf(cur)}`);

export const validAccounts = list => (Array.isArray(list) ? list : [])
  .filter(a => a && a.id && a.name)
  .map(a => ({ ...a, cur: CURRENCIES.some(c => c.id === a.cur) ? a.cur : 'KZT', kind: ACC_KINDS.some(k => k.id === a.kind) ? a.kind : 'card', start: Number(a.start) || 0, since: a.since || '1970-01-01', sinceAt: Number(a.sinceAt) || 0 }));

export const ratesOf = settings => {
  const r = { KZT: 1, ...DEFAULT_RATES };
  Object.entries((settings && settings.rates) || {}).forEach(([k, v]) => { if (Number(v) > 0 && k !== 'KZT') r[k] = Number(v); });
  return r;
};

export function accountIdOf(method, accounts) {
  if (!accounts.length) return null;
  const exact = accounts.find(a => a.id === method);
  if (exact) return exact.id;
  if (method === 'cash') return (accounts.find(a => a.kind === 'cash') || {}).id || null;
  return (accounts.find(a => a.kind === 'card' && a.cur === 'KZT') || {}).id || null;
}

/**
 * ctx: { txs, incomes, transfers, fx, rates, salary, salaryAcc, periodStarts (ISO-даты начала периодов), todayIso }
 * Операция учитывается, если она после момента, когда указали остаток: дата позже since,
 * либо тот же день, но внесена позже (created_at / at).
 */
export function balances(accounts, ctx) {
  const { txs = [], incomes = [], transfers = [], fx = {}, rates, salary = 0, salaryAcc = null, periodStarts = [], todayIso } = ctx;
  const inCur = (op, cur) => {
    const f = fx[op.id];
    if (f && f.c === cur) return Number(f.a) || 0;
    return cur === 'KZT' ? op.amount : op.amount / (rates[cur] || 1);
  };
  return accounts.map(a => {
    const after = (date, at) => date > a.since || (date === a.since && (!at || at > a.sinceAt));
    const ts = op => (op.created_at ? Date.parse(op.created_at) : 0);
    let bal = a.start;
    txs.forEach(t => { if (after(t.date, ts(t)) && accountIdOf(t.method, accounts) === a.id) bal -= inCur(t, a.cur); });
    incomes.forEach(i => { if (i.date <= todayIso && after(i.date, ts(i)) && accountIdOf(i.method, accounts) === a.id) bal += inCur(i, a.cur); });
    transfers.forEach(x => {
      if (!after(x.date, Number(x.at) || 0)) return;
      if (x.from === a.id) bal -= Number(x.amount) || 0;
      if (x.to === a.id) bal += Number(x.got) || 0;
    });
    if (salary > 0 && salaryAcc === a.id) periodStarts.forEach(p => { if (p > a.since && p <= todayIso) bal += a.cur === 'KZT' ? salary : salary / (rates[a.cur] || 1); });
    const kzt = a.cur === 'KZT' ? bal : bal * (rates[a.cur] || 1);
    return { ...a, balance: bal, balanceFmt: money(bal, a.cur), kzt };
  });
}
