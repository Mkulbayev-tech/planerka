// Константы макета budget-planner-v2, форматирование сумм и демо-данные для локального режима.
import { iso, startOfDay, addDays, daysBetween, periodBounds } from './lib/dates.js';

export const ACCENT = '#7A4AE0';
export const GREEN = '#2FA66F';
export const RED = '#E0553F';
export const AMBER = '#F2A83B';

export const DEFAULT_SETTINGS = { salary: 600000, monthStartDay: 5, limits: {} };

export const CATS = [
  { id: 'food', name: 'Продукты', color: '#2FA66F', bg: '#E6F6EE', limit: 80000 },
  { id: 'cafe', name: 'Кафе', color: '#E0553F', bg: '#FCE9E5', limit: 20000 },
  { id: 'home', name: 'Жильё', color: '#7A4AE0', bg: '#EFE9FC', limit: 45000 },
  { id: 'transport', name: 'Транспорт', color: '#2F5BEA', bg: '#E8EDFD', limit: 25000 },
  { id: 'fun', name: 'Развлечения', color: '#F2A83B', bg: '#FDF1DE', limit: 20000 },
  { id: 'health', name: 'Здоровье', color: '#1BA3B5', bg: '#E1F5F7', limit: 15000 },
];
export const CAT_BY_ID = Object.fromEntries(CATS.map(c => [c.id, c]));

export const TAGS = ['Дом', 'Покупки', 'Платежи', 'Накопления', 'Здоровье'];
export const TAG_COLORS = {
  'Дом': ['#7A4AE0', '#EFE9FC'], 'Покупки': ['#2FA66F', '#E6F6EE'], 'Платежи': ['#2F5BEA', '#E8EDFD'],
  'Накопления': ['#F2A83B', '#FDF1DE'], 'Здоровье': ['#1BA3B5', '#E1F5F7'],
};
export const GOAL_PALETTE = [
  ['#F2A83B', '#FDF1DE'], ['#7A4AE0', '#EFE9FC'], ['#2FA66F', '#E6F6EE'],
  ['#2F5BEA', '#E8EDFD'], ['#E0553F', '#FCE9E5'], ['#1BA3B5', '#E1F5F7'],
];

export const THEMES = {
  light: { bg: '#F4F3F8', cd: '#FFFFFF', tx: '#16141D', mu: '#7E7B8A', ln: '#ECEAF2', as: '#EFE9FC', ip: '#F1EFF6', sh: '0 2px 12px rgba(30,20,60,0.05)' },
  dark: { bg: '#0F0E13', cd: '#1C1B22', tx: '#F5F3FA', mu: '#9D9AAA', ln: '#2A2833', as: '#2A2145', ip: '#26242E', sh: 'none' },
};

export const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'];

export const fmt = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0₸';
export const short = n =>
  n >= 1000000
    ? (n / 1000000).toFixed(2).replace('.', ',').replace(/,?0+$/, '') + '\u00A0млн\u00A0₸'
    : n >= 1000
      ? Math.round(n / 1000) + '\u00A0тыс\u00A0₸'
      : fmt(n);

export const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

// Демо-данные из макета, привязанные к текущему периоду (используются только в локальном режиме).
export function demoSeed(now = new Date()) {
  const today = startOfDay(now);
  const todayIso = iso(today);
  const { start } = periodBounds(now, DEFAULT_SETTINGS.monthStartDay);
  const elapsed = daysBetween(start, today);
  const dayAt = k => iso(addDays(start, Math.max(0, Math.min(elapsed, k))));
  const scale = elapsed >= 11 ? 1 : elapsed / 11;

  const base = [
    ['Аренда квартиры', 'home', 45000, 'card', 0], ['Magnum', 'food', 18400, 'card', 1], ['Проездной', 'transport', 9000, 'card', 1],
    ['Кофейня у дома', 'cafe', 3200, 'cash', 2], ['Аптека', 'health', 5250, 'card', 3], ['Кино', 'fun', 7300, 'card', 4],
    ['Рынок', 'food', 12500, 'cash', 5], ['Обед с коллегами', 'cafe', 8600, 'cash', 6], ['Такси', 'transport', 9200, 'card', 7],
    ['Small', 'food', 15300, 'card', 8], ['Боулинг', 'fun', 5000, 'cash', 9], ['Ужин в ресторане', 'cafe', 12800, 'card', 10],
    ['Galmart', 'food', 12200, 'cash', 11],
  ];
  const txs = base.map(([title, cat, amount, method, off], i) => ({
    id: 'demo-tx' + i, title, cat, amount, method, date: dayAt(Math.round(off * scale)), created_by: 'local', created_at: String(i).padStart(4, '0'),
  }));

  const tasks = [
    { id: 't1', name: 'Выпечка на заказ', time: '08:00', cat: 'food', cost: 6500, done: true, tag: 'Дом', date: todayIso },
    { id: 't2', name: 'Уборка кухни', time: '10:30', cat: null, cost: 0, done: true, tag: 'Дом', date: todayIso },
    { id: 't3', name: 'Закупка продуктов в Magnum', time: '12:00', cat: 'food', cost: 15000, done: false, tag: 'Покупки', date: todayIso },
    { id: 't4', name: 'Оплатить коммунальные', time: '14:00', cat: 'home', cost: 18500, done: false, tag: 'Платежи', date: todayIso },
    { id: 't5', name: 'Отложить на отпуск', time: '18:00', cat: null, cost: 20000, done: false, tag: 'Накопления', date: todayIso },
    { id: 't6', name: 'Тренировка', time: '19:30', cat: null, cost: 0, done: false, tag: 'Здоровье', date: todayIso },
  ];
  const names = ['Уборка', 'Готовка', 'Оплата счетов', 'Покупки', 'Спорт', 'Отложить деньги', 'Прогулка', 'Разобрать почту'];
  const tagOf = { 'Уборка': 'Дом', 'Готовка': 'Дом', 'Оплата счетов': 'Платежи', 'Покупки': 'Покупки', 'Спорт': 'Здоровье', 'Отложить деньги': 'Накопления', 'Прогулка': 'Здоровье', 'Разобрать почту': 'Дом' };
  for (let k = 1; k <= Math.min(elapsed, 20); k++) {
    const d = iso(addDays(today, -k));
    const n = 3 + ((k * 7) % 4);
    for (let j = 0; j < n; j++) {
      const name = names[(k + j * 3) % names.length];
      tasks.push({ id: `demo-t-${k}-${j}`, name, time: `${String(8 + j * 2).padStart(2, '0')}:00`, tag: tagOf[name], cat: name === 'Покупки' ? 'food' : null, cost: name === 'Покупки' ? 8000 : 0, done: (k + j) % 5 !== 0, date: d });
    }
  }

  const topupDate = dayAt(0);
  const goals = [
    { id: 'trip', name: 'Отпуск в Турции', saved: 450000, target: 1200000, color: '#F2A83B', bg: '#FDF1DE', per: 60000, topups: [{ date: topupDate, amount: 60000 }] },
    { id: 'mac', name: 'Новый MacBook', saved: 310000, target: 900000, color: '#7A4AE0', bg: '#EFE9FC', per: 40000, topups: [{ date: topupDate, amount: 40000 }] },
    { id: 'safe', name: 'Подушка безопасности', saved: 1250000, target: 1800000, color: '#2FA66F', bg: '#E6F6EE', per: 20000, topups: [{ date: topupDate, amount: 20000 }] },
  ];
  const incomes = [{ id: 'demo-inc1', title: 'Фриланс: дизайн лендинга', amount: 50000, date: dayAt(7), method: 'card' }];

  return { txs, tasks, goals, incomes, settings: { ...DEFAULT_SETTINGS } };
}
