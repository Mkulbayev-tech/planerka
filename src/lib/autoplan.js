// Автораспределение бюджета и подбор категории траты — чистые функции без React.
import { fmt } from '../data.js';

// ── Распределение дохода по категориям ─────────────────────────────────────
// Порядок: взносы в цели → обязательные платежи (не урезаются) → повседневные траты
// по привычной сумме (с экономией, если выбрана) → что осталось — свободно.
// Лимит категории не бывает меньше уже потраченного плюс запланированного в задачах.

export const SAVE_LEVELS = [
  { id: 0, label: 'Нет' },
  { id: 0.1, label: 'На 10%' },
  { id: 0.2, label: 'На 20%' },
];

const FIXED_RE = /кредит|рассроч|ипотек|аренд|жиль|коммун|связь|интернет|подписк|страхов|садик|школ/i;
export const isFixedCat = c => c.id === 'home' || FIXED_RE.test(c.name || '');

const STEP = 1000;
const up = n => Math.ceil(n / STEP) * STEP;
const near = n => Math.round(n / STEP) * STEP;
const sum = (list, f) => list.reduce((a, x) => a + (f(x) || 0), 0);
const pct = (a, b) => (b > 0 ? Math.round(a / b * 100) : 0);
const num = n => fmt(n).replace(/\u00A0₸$/, ''); // в подписях без «₸», чтобы влезало

/**
 * input: {
 *   income,                       доход текущего периода
 *   goals: [{ per, saved, target }],
 *   cats: [{ id, name, color, bg, letter, limit, hidden }],  limit — действующий лимит
 *   spent: { [catId]: ₸ }          потрачено в этом периоде
 *   planned: { [catId]: ₸ }        затраты невыполненных задач до конца периода
 *   history: { [catId]: ₸ }        средние траты за прошлые периоды
 *   historyCount, daysElapsed, periodDays
 * }
 * save — доля, на которую урезать повседневные траты (0, 0.1, 0.2).
 */
export function planBudget(input, save = 0) {
  const { income = 0, goals = [], cats = [], spent = {}, planned = {}, history = {}, historyCount = 0, daysElapsed = 1, periodDays = 30 } = input;
  const cut = Math.min(0.5, Math.max(0, Number(save) || 0));
  const basis = historyCount > 0 ? 'history' : daysElapsed >= 7 ? 'pace' : 'limits';

  const goalsRes = sum(goals.filter(g => g.per > 0 && g.saved < g.target), g => Math.min(g.per, g.target - g.saved));
  // 5% дохода держим на непредвиденное, пока это не требует урезать траты ниже потраченного
  const buffer = near(income * 0.05);

  const fixedIds = new Set(input.fixedIds || []); // категории регулярных платежей тоже обязательные
  const rows = cats.filter(c => !c.hidden).map(c => {
    const fixed = isFixedCat(c) || fixedIds.has(c.id);
    const cur = spent[c.id] || 0;
    const plan = planned[c.id] || 0;
    const floor = cur + plan;
    const hist = history[c.id] || 0;
    const base = basis === 'history' ? hist
      : basis === 'pace' ? (fixed ? cur : cur / Math.max(1, daysElapsed) * periodDays)
        : c.limit || 0;
    let need = Math.max(base, floor);
    // Нет ни истории, ни трат, ни планов — оставляем прежний лимит
    const kept = need === 0;
    if (kept) need = c.limit || 0;
    return { c, fixed, cur, plan, floor, hist, base, need, kept };
  }).filter(r => r.need > 0);

  const fixedRows = rows.filter(r => r.fixed);
  const flexRows = rows.filter(r => !r.fixed);
  fixedRows.forEach(r => { r.limit = up(r.need); });
  flexRows.forEach(r => { r.want = r.kept ? r.need : Math.max(r.floor, r.need * (1 - cut)); });

  const fixedSum = sum(fixedRows, r => r.limit);
  const room = income - goalsRes - buffer - fixedSum;
  const flexWant = sum(flexRows, r => r.want);
  const k = flexWant > 0 ? Math.min(1, Math.max(0, room) / flexWant) : 1;
  flexRows.forEach(r => { r.limit = Math.max(STEP, up(r.floor), near(r.want * k)); });

  const flexSum = sum(flexRows, r => r.limit);
  const total = fixedSum + flexSum;
  const free = income - goalsRes - total;

  const meta = r => {
    const parts = [];
    if (r.kept) parts.push('нет данных — прежний лимит');
    else if (basis === 'history' && r.hist) parts.push('обычно ' + num(near(r.hist)));
    else if (basis === 'pace' && r.cur && !r.fixed) parts.push('по темпу ' + num(near(r.base)));
    else if (r.cur) parts.push('уже ' + num(r.cur));
    if (r.plan) parts.push('в планах ' + num(r.plan));
    return parts.join(' · ');
  };
  const view = r => ({
    id: r.c.id, name: r.c.name, color: r.c.color, bg: r.c.bg, icon: r.c.icon, letter: r.c.letter || (r.c.name.trim()[0] || '?').toUpperCase(),
    fixed: r.fixed, kept: r.kept, limit: r.limit, limitFmt: fmt(r.limit), prev: r.c.limit || 0,
    prevFmt: r.c.limit ? fmt(r.c.limit) : 'без лимита', changed: r.limit !== (r.c.limit || 0), meta: meta(r),
  });
  const ordered = [...fixedRows, ...flexRows].sort((a, b) => (a.fixed === b.fixed ? b.limit - a.limit : a.fixed ? -1 : 1));

  const shareBase = Math.max(income, total + goalsRes);
  const parts = [
    { id: 'fixed', name: 'Обязательные', value: fixedSum, color: '#C99A45' },
    { id: 'flex', name: 'Повседневные', value: flexSum, color: '#6F9BDB' },
    { id: 'goals', name: 'В цели', value: goalsRes, color: '#A08AD6' },
    { id: 'free', name: 'Свободно', value: Math.max(0, free), color: '#4FA77B' },
  ].filter(p => p.value > 0).map(p => ({ ...p, valueFmt: fmt(p.value), share: pct(p.value, shareBase) }));

  return {
    basis, historyCount, save: cut, income, incomeFmt: fmt(income),
    goalsRes, goalsResFmt: fmt(goalsRes), buffer,
    fixedSum, flexSum, total, totalFmt: fmt(total),
    free, freeFmt: fmt(Math.abs(free)), short: free < 0, scaled: k < 1,
    rows: ordered.map(view), parts,
    limits: Object.fromEntries(rows.map(r => [r.c.id, r.limit])),
  };
}

// Подпись «на чём основан план»
export function basisText(p) {
  if (p.basis === 'history') {
    const n = p.historyCount;
    return `По средним тратам за ${n === 1 ? 'прошлый месяц' : n + ' прошлых месяца'}, уже потраченному и задачам с затратами`;
  }
  if (p.basis === 'pace') return 'Прошлых месяцев ещё нет — по темпу трат в этом периоде и задачам с затратами';
  return 'Пока мало данных — по текущим лимитам; через неделю трат план станет точнее';
}

// ── Подбор категории по комментарию к трате ────────────────────────────────
// Сначала прошлые траты с таким же названием (семья уже относила «Magnum» к продуктам),
// потом ключевые слова для встроенных и типовых своих категорий.

const KEYWORDS = {
  food: ['yandex lavka', 'яндекс лавка', 'magnum', 'магнум', 'small', 'смолл', 'galmart', 'галмарт', 'анвар', 'arbuz', 'арбуз', 'рынок', 'базар', 'продукт', 'супермаркет', 'хлеб', 'молок', 'мясо', 'овощ', 'фрукт', 'toimart', 'airba'],
  cafe: ['yandex eats', 'яндекс еда', 'кафе', 'кофе', 'кофейн', 'coffee', 'ресторан', 'обед', 'ужин', 'завтрак', 'пицц', 'суши', 'бургер', 'kfc', 'макдон', 'доставк', 'wolt', 'glovo', 'шаурм', 'чайхан', 'столов'],
  transport: ['yandex go', 'яндекс go', 'яндекс такси', 'такси', 'taxi', 'uber', 'indrive', 'проезд', 'автобус', 'onay', 'онай', 'метро', 'бензин', 'азс', 'заправк', 'топлив', 'парковк', 'автомойк', 'шиномонтаж', 'helios', 'sinooil'],
  // интернет и связь — сюда, только если у семьи нет своей категории «Связь» (свои проверяются раньше)
  home: ['аренд', 'квартир', 'коммунал', 'отоплен', 'электроэнерг', 'ремонт', 'мебел', 'хозтовар', 'интернет', 'казахтелеком', 'kazakhtelecom', 'beeline', 'билайн', 'kcell', 'tele2', 'теле2', 'altel', 'алтел', 'мобильн', 'сотов'],
  health: ['аптек', 'врач', 'клиник', 'анализ', 'стоматолог', 'зуб', 'лекарств', 'витамин', 'массаж', 'invitro', 'больниц'],
  fun: ['кино', 'kinopark', 'кинопарк', 'chaplin', 'чаплин', 'cinemax', 'cinema', 'боулинг', 'театр', 'концерт', 'netflix', 'spotify', 'музей', 'бильярд', 'караоке', 'аквапарк', 'каток'],
};
// Для своих категорий — по их названию
const CUSTOM_KEYWORDS = [
  [/связь|телефон|мобил/i, ['связь', 'beeline', 'билайн', 'kcell', 'tele2', 'теле2', 'activ', 'актив', 'altel', 'алтел', 'мобильн', 'интернет', 'kazakhtelecom', 'казахтелеком']],
  [/кредит/i, ['кредит', 'займ', 'долг']],
  [/рассроч/i, ['рассрочк', 'kaspi red']],
  [/дет/i, ['детск', 'садик', 'школ', 'игрушк', 'кружок', 'секци', 'подгузн', 'памперс']],
  [/одежд/i, ['одежд', 'обув', 'кроссовк', 'куртк', 'джинс', 'zara', 'lc waikiki']],
  [/подар/i, ['подар', 'цветы', 'букет']],
  [/быт|хоз|дом/i, ['fairy', 'порошок', 'мыло', 'шампун', 'туалетн', 'губк', 'салфетк', 'стиральн', 'чистящ', 'пакеты', 'средство']],
];

const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"']/g, '').replace(/\s+/g, ' ').trim();
const words = s => norm(s).split(/[^a-zа-я0-9&]+/i).filter(Boolean);
const hasWord = (text, key) => {
  const k = words(key);
  if (k.length > 1) return (' ' + words(text).join(' ') + ' ').includes(' ' + k.join(' ')); // фраза: «yandex go» = «Yandex.Go»
  return words(text).some(w => w.startsWith(k[0] || '\u0000'));
};

// cats — доступные для выбора категории (без скрытых), txs — все траты семьи
export function guessCat(note, txs, cats) {
  const q = norm(note);
  if (q.length < 2) return null;
  const ids = new Set(cats.map(c => c.id));
  const catName = Object.fromEntries(cats.map(c => [c.id, norm(c.name)]));

  // 1. Прошлые траты: точное название, затем начало названия (от 3 букв)
  const score = {};
  const add = (id, w) => { score[id] = (score[id] || 0) + w; };
  txs.forEach((t, i) => {
    if (!ids.has(t.cat)) return;
    const title = norm(t.title);
    if (!title || title === catName[t.cat]) return; // без комментария название = категория, это не сигнал
    const recency = 1 + i / Math.max(1, txs.length); // свежие траты весят чуть больше
    if (title === q) add(t.cat, 10 * recency);
    else if (q.length >= 3 && (title.startsWith(q) || q.startsWith(title))) add(t.cat, recency);
  });
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (best) return best[0];

  // 2. Название своей категории прямо в комментарии («кредит каспи» → «Кредит»)
  const direct = cats.find(c => c.custom && words(c.name).some(w => w.length >= 4 && hasWord(q, w.slice(0, Math.max(4, w.length - 2)))));
  if (direct) return direct.id;

  // 3. Ключевые слова
  for (const c of cats) {
    if (!c.custom) continue;
    const entry = CUSTOM_KEYWORDS.find(([re]) => re.test(c.name));
    if (entry && entry[1].some(k => hasWord(q, k))) return c.id;
  }
  for (const [id, keys] of Object.entries(KEYWORDS)) {
    if (ids.has(id) && keys.some(k => hasWord(q, k))) return id;
  }
  return null;
}
