// Константы макета budget-planner-v2, форматирование сумм и демо-данные для локального режима.
import { iso, startOfDay, addDays, daysBetween, periodBounds } from './lib/dates.js';

// Цвета «Вечера» для мест вне темы (виджеты). Внутри приложения — THEMES ниже.
export const ACCENT = '#E3B65C';
export const GREEN = '#8FC9A3';
export const RED = '#F08A6C';
export const AMBER = '#E9A25F';

export const DEFAULT_SETTINGS = { salary: 600000, monthStartDay: 5, limits: {} };

export const CATS = [
// Цвета категорий — для светлой темы; в тёмной модель осветляет их (mix с белым)
  { id: 'food', name: 'Продукты', icon: 'cart', color: '#2F8A55', dark: '#8FCBA3', bg: '#E6F3EC', limit: 80000 },
  { id: 'cafe', name: 'Кафе', icon: 'cup', color: '#6B5BC2', dark: '#B4A7EC', bg: '#EEEAFB', limit: 20000 },
  { id: 'home', name: 'Жильё', icon: 'home', color: '#B4862A', dark: '#E8B85A', bg: '#FBF1DC', limit: 45000 },
  { id: 'transport', name: 'Транспорт', icon: 'bus', color: '#3474B8', dark: '#7FB2E5', bg: '#E7EFFA', limit: 25000 },
  { id: 'fun', name: 'Развлечения', icon: 'film', color: '#CF5536', dark: '#EE8669', bg: '#FBE7E1', limit: 20000 },
  { id: 'health', name: 'Здоровье', icon: 'heart', color: '#2E8C86', dark: '#7FD1C7', bg: '#E1F1F3', limit: 15000 },
];
export const CAT_BY_ID = Object.fromEntries(CATS.map(c => [c.id, c]));

// Свои категории семьи лежат в settings.cats: { id, name, color, bg, hidden }.
// hidden — категория удалена, но по ней остались траты: из выбора убрана, в истории видна.
export const CAT_PALETTE = [
  ['#C4577A', '#F7E4EB'], ['#C9733A', '#F8EADF'], ['#8A6A45', '#F1EBE3'], ['#6F7FD6', '#E9ECFA'],
  ['#7C9A3C', '#EEF3E2'], ['#A766B8', '#F3E8F6'], ['#2F8F86', '#E0F1EF'], ['#6B7280', '#ECEDEF'],
];
export const CAT_SUGGEST = ['Кредит', 'Рассрочка', 'Связь', 'Дети', 'Одежда', 'Подарки'];
// Трата с неизвестной категорией (например, стёртой вручную) попадает сюда, а не в «Продукты».
export const OTHER_CAT = { id: 'other', name: 'Другое', icon: 'box', color: '#77726A', dark: '#9C9890', bg: '#EFEDE8', limit: 0 };

// Иконка своей категории (линейная, из components/ui.jsx): выбранная вручную или подобранная по названию;
// без неё — первая буква. Старые значения-эмодзи игнорируются.
const ICON_RULES = [
  [/кредит|рассроч|ипотек|займ|долг/i, 'card'], [/садик|детсад|школ|дет|ребён|ребен|малыш|игрушк/i, 'blocks'],
  [/одежд|обув/i, 'shirt'], [/связь|телефон|мобил|интернет/i, 'phone'], [/подар|праздник/i, 'gift'],
  [/спорт|фитнес|трениров/i, 'dumbbell'], [/красот|салон|космет|маникюр/i, 'sparkle'], [/путешеств|отпуск|поездк/i, 'plane'],
  [/авто|машин|бензин|топлив/i, 'car'], [/животн|кот|собак|питом/i, 'paw'], [/учёб|учеб|курс|книг|образован/i, 'book'],
  [/коммун|свет|газ|вода/i, 'bulb'], [/подписк/i, 'repeat'], [/еда|ресторан|доставк/i, 'fork'],
  [/аптек|лекар|врач/i, 'pulse'], [/благотвор|помощь|родител/i, 'heart'],
];
export const CAT_ICON_CHOICES = ['cart', 'cup', 'home', 'bus', 'film', 'pulse', 'card', 'blocks', 'shirt', 'phone', 'gift', 'car', 'plane', 'paw', 'book', 'bulb', 'dumbbell', 'sparkle', 'fork', 'heart', 'user', 'box'];
const ICON_SET = new Set([...CAT_ICON_CHOICES, 'repeat']);
export const guessIcon = name => { const r = ICON_RULES.find(([re]) => re.test(name || '')); return r ? r[1] : null; };
export const iconOf = c => (c && ICON_SET.has(c.icon) ? c.icon : guessIcon(c && c.name));

export const allCats = settings => [
  ...CATS,
  ...(settings && Array.isArray(settings.cats) ? settings.cats : [])
    .filter(c => c && c.id && c.name)
    .map(c => ({ limit: 0, ...c, icon: iconOf(c), custom: true })),
];

export const TAGS = ['Дом', 'Покупки', 'Платежи', 'Накопления', 'Здоровье'];
export const TAG_COLORS = {
  'Дом': ['#7A4AE0', '#EFE9FC'], 'Покупки': ['#2FA66F', '#E6F6EE'], 'Платежи': ['#2F5BEA', '#E8EDFD'],
  'Накопления': ['#F2A83B', '#FDF1DE'], 'Здоровье': ['#1BA3B5', '#E1F5F7'],
};
export const GOAL_PALETTE = [
  ['#B48A35', '#F6EEDC'], ['#3E9B6E', '#E6F3EC'], ['#5C8FD6', '#E7EFFA'],
  ['#D9774F', '#FAEAE2'], ['#9277CF', '#EFEAF8'], ['#2E95A3', '#E1F1F3'],
];

// Темы: «Вечер» (тёмная, по умолчанию) и «Белая». ac — заливка акцента, at — акцентный текст (контраст ≥ 4.5),
// on — текст на акцентной заливке, bd — рамки карточек, bar — нижняя панель, gr/rd/am — приход, расход/превышение, внимание.
export const THEMES = {
  // значения — из макета Claude Design «Семейный бюджет» (тёмная и светлая версии)
  dark: {
    bg: '#131313', cd: '#1C1C1C', tx: '#F3F1EC', mu: '#9C9890', ln: '#262626', bd: '#2A2A2A', as: '#2A2416', ip: '#242424', sh: 'none',
    ac: '#E8B85A', at: '#E8B85A', on: '#131313', gr: '#8FCBA3', rd: '#EE8669', am: '#E8B85A', bar: '#161616', off: '#3A3A3A',
    lv: '#B4A7EC', bl: '#7FB2E5', grBg: '#1C2A20', rdBg: '#2E1E19',
  },
  light: {
    bg: '#F6F4EF', cd: '#FFFFFF', tx: '#1A1814', mu: '#77726A', ln: '#ECE8E0', bd: '#ECE8E0', as: '#FBF1DC', ip: '#F0ECE4', sh: 'none',
    ac: '#E8B85A', at: '#A87A1E', on: '#1A1814', gr: '#2F8A55', rd: '#CF5536', am: '#A87A1E', bar: '#FFFFFF', off: '#D9D4CA',
    lv: '#6B5BC2', bl: '#3474B8', grBg: '#E5F3EA', rdBg: '#FBE7E1',
  },
};
// Смешать цвет с белым (доля t): в тёмной теме цвета категорий светлее, чтобы читались на тёмном
export const mix = (hex, t) => {
  const n = parseInt(String(hex).slice(1), 16);
  if (!Number.isFinite(n)) return hex;
  const ch = s => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * t);
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
};

export const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'];

export const fmt = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0₸';
export const short = n =>
  n >= 1000000
    ? (n / 1000000).toFixed(2).replace('.', ',').replace(/,?0+$/, '') + '\u00A0млн\u00A0₸'
    : n >= 1000
      ? Math.round(n / 1000) + '\u00A0тыс\u00A0₸'
      : fmt(n);

// 1 трата, 3 траты, 5 трат
export const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};
export const traty = n => `${n} ${plural(n, 'трата', 'траты', 'трат')}`;

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
