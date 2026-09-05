// Производные значения для экранов и виджетов: всё считается от реальных дат и общих данных семьи.
import { ACCENT, GREEN, RED, AMBER, CATS, CAT_BY_ID, TAGS, TAG_COLORS, THEMES, DEFAULT_SETTINGS, fmt, short } from './data.js';
import {
  iso, startOfDay, addDays, daysBetween, inRange, parseIso, periodBounds, weekBounds,
  longLabel, dayMonth, shortDate, MONTHS_NOM, MONTHS_CAP, WEEKDAYS_SHORT,
} from './lib/dates.js';

const sum = (list, f) => list.reduce((a, x) => a + (f(x) || 0), 0);
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.created_at || '').localeCompare(String(b.created_at || '')));
const signed = n => (n > 0 ? '+' : '') + n;
const EMPTY = { txs: [], tasks: [], goals: [], incomes: [] };

export function derive(s, now = new Date()) {
  const dark = !!s.dark;
  const th = dark ? THEMES.dark : THEMES.light;
  const data = s.data || EMPTY;
  const household = s.household || null;
  const settings = { ...DEFAULT_SETTINGS, ...((household && household.settings) || {}) };
  const salary = Math.max(0, Number(settings.salary) || 0);
  const startDay = Math.min(28, Math.max(1, Number(settings.monthStartDay) || 5));
  const limits = settings.limits || {};
  const members = s.members || [];
  const nameOf = id => { const m = members.find(x => x.user_id === id); return (m && m.display_name) || ''; };
  const meName = (s.me && s.me.display_name) || (s.user && s.user.email ? s.user.email.split('@')[0] : '') || 'Айдана';

  // Даты
  const today = startOfDay(now);
  const todayIso = iso(today);
  const P = periodBounds(now, startDay);
  const prevP = periodBounds(now, startDay, -1);
  const W = weekBounds(now);
  const daysLeft = Math.max(1, daysBetween(today, P.end));
  const daysElapsed = daysBetween(P.start, today) + 1;
  const inP = list => list.filter(x => inRange(x.date, P.startIso, P.endIso));
  const periodIncome = Pk => salary + sum(data.incomes.filter(i => inRange(i.date, Pk.startIso, Pk.endIso)), i => i.amount);
  const periodSpent = Pk => sum(data.txs.filter(t => inRange(t.date, Pk.startIso, Pk.endIso)), t => t.amount);

  // Доходы
  const incomesP = inP(data.incomes).sort(byDate);
  const income = periodIncome(P);
  const incomePrev = periodIncome(prevP);
  const incomeDelta = incomePrev ? Math.round((income - incomePrev) / incomePrev * 100) : 0;
  const avg6 = Math.round(sum([0, 1, 2, 3, 4, 5], k => periodIncome(periodBounds(now, startDay, -k))) / 6);
  const incomeRows = [
    ...(salary > 0 ? [{ id: 'salary', kind: 'salary', letter: 'З', name: 'Зарплата', meta: `${dayMonth(P.start)} · карта`, amount: salary, amountFmt: fmt(salary) }] : []),
    ...incomesP.map(i => ({
      ...i, kind: 'income', letter: (i.title || 'Д').trim()[0].toUpperCase(), name: i.title,
      meta: `${shortDate(i.date)} · ${i.method === 'cash' ? 'наличные' : 'карта'}`, amountFmt: fmt(i.amount),
    })),
  ];

  // Расходы за период
  const txsAll = [...data.txs].sort(byDate);
  const txs = inP(txsAll);
  const spent = sum(txs, t => t.amount);
  const cashTx = txs.filter(t => t.method === 'cash');
  const cardTx = txs.filter(t => t.method !== 'cash');
  const cash = sum(cashTx, t => t.amount);
  const card = spent - cash;
  const cashPct = pct(cash, spent);
  const cardPct = spent ? 100 - cashPct : 0;

  const catStats = CATS.map(c => {
    const limit = Number(limits[c.id]) > 0 ? Number(limits[c.id]) : c.limit;
    const list = txs.filter(t => t.cat === c.id);
    const sp = sum(list, t => t.amount);
    const bp = Math.round(sp / limit * 100);
    const over = sp > limit;
    const warn = !over && bp >= 80;
    return {
      ...c, limit, letter: c.name[0], count: list.length, spent: sp, spentFmt: fmt(sp), spentShort: short(sp),
      share: pct(sp, spent), limitFmt: fmt(limit), budgetPct: Math.min(100, bp),
      barColor: over ? RED : warn ? AMBER : c.color,
      status: over ? 'Превышено на ' + fmt(sp - limit) : 'Осталось ' + fmt(limit - sp),
      statusColor: over ? RED : warn ? AMBER : th.mu,
    };
  }).sort((a, b) => b.spent - a.spent);
  let acc = 0;
  const donut = 'conic-gradient(' +
    catStats.map(c => { const from = acc; acc += c.share; return `${c.color} ${from}% ${acc}%`; }).join(', ') +
    (acc < 100 ? `, ${th.ip} ${acc}% 100%` : '') + ')';
  const budgetTotal = sum(catStats, c => c.limit);

  const toTx = t => {
    const c = CAT_BY_ID[t.cat] || CATS[0];
    const who = nameOf(t.created_by);
    const methodName = t.method === 'cash' ? 'наличные' : 'карта';
    return {
      ...t, letter: c.name[0], color: c.color, bg: c.bg, catName: c.name, amountFmt: fmt(t.amount), dateLabel: shortDate(t.date), methodName, author: who,
      meta: `${c.name} · ${methodName} · ${shortDate(t.date)}${who && members.length > 1 ? ' · ' + who : ''}`,
    };
  };
  const recentTxs = [...txs].reverse().slice(0, 6).map(toTx);
  const topTxs = [...txs].sort((a, b) => b.amount - a.amount).slice(0, 3).map(toTx);

  // Цели
  const goals = data.goals.map(g => {
    const p = g.target ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0;
    const months = g.per > 0 ? Math.max(0, Math.ceil((g.target - g.saved) / g.per)) : null;
    return {
      ...g, letter: (g.name || 'Ц').trim()[0].toUpperCase(), pct: p,
      savedFmt: fmt(g.saved), targetFmt: fmt(g.target), savedShort: short(g.saved), targetShort: short(g.target),
      eta: p >= 100 ? 'Цель достигнута' : months === null ? 'Без плана пополнений' : `Ещё ${months} мес · по ${fmt(g.per)} в месяц`,
    };
  });
  const savedTotal = sum(data.goals, g => g.saved);
  const perMonth = sum(data.goals, g => g.per);
  const topupsIn = (a, b) => sum(data.goals.flatMap(g => g.topups || []).filter(t => inRange(t.date, a, b)), t => t.amount);

  // Баланс до зарплаты
  const balance = income - spent;
  const spentPct = pct(spent, income);

  // Неделя
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const dIso = iso(addDays(W.start, i));
    return { iso: dIso, label: WEEKDAYS_SHORT[i], v: sum(txsAll.filter(t => t.date === dIso), t => t.amount), tasks: data.tasks.filter(t => t.date === dIso) };
  });
  const weekTotal = sum(weekDays, d => d.v);
  const weekMax = Math.max(1, ...weekDays.map(d => d.v));
  const prevWeekTotal = sum(txsAll.filter(t => inRange(t.date, iso(addDays(W.start, -7)), W.startIso)), t => t.amount);
  const weekDelta = prevWeekTotal ? Math.round((weekTotal - prevWeekTotal) / prevWeekTotal * 100) : null;
  const weekDeltaText = weekDelta === null ? 'первая неделя' : `${weekDelta > 0 ? '+' : weekDelta < 0 ? '−' : ''}${Math.abs(weekDelta)}% к прошлой`;
  const bar = (d, i, dim, dimLabel) => ({ label: d.label, h: Math.max(4, Math.round(d.v / weekMax * 100)), color: i === W.index ? ACCENT : dim, labelColor: i === W.index ? (dimLabel ? '#fff' : th.tx) : (dimLabel || th.mu) });
  const weekBars = weekDays.map((d, i) => bar(d, i, th.ip, null));
  const weekBarsDark = weekDays.map((d, i) => bar(d, i, '#2E2C3A', '#9D9AAA'));

  // Дашборд: доходы и расходы по периодам
  const periods6 = [5, 4, 3, 2, 1, 0].map(k => periodBounds(now, startDay, -k));
  const monthPairs = periods6.map(Pk => ({ label: MONTHS_CAP[Pk.start.getMonth()], i: periodIncome(Pk), e: periodSpent(Pk) }));
  const weekPairs = weekDays.map(d => ({ label: d.label, i: (d.iso === P.startIso ? salary : 0) + sum(data.incomes.filter(x => x.date === d.iso), x => x.amount), e: d.v }));
  const thisYear = today.getFullYear();
  const yearPairs = [4, 3, 2, 1, 0].map(k => {
    const y = thisYear - k;
    const ys = `${y}-01-01`, ye = `${y + 1}-01-01`;
    const e = sum(txsAll.filter(t => inRange(t.date, ys, ye)), t => t.amount);
    const extra = sum(data.incomes.filter(x => inRange(x.date, ys, ye)), x => x.amount);
    let started = 0;
    for (let m = 0; m < 12; m++) if (new Date(y, m, startDay) <= today) started++;
    return { label: String(y), i: (e || extra) ? salary * started + extra : 0, e };
  });
  const pairs = s.period === 'week' ? weekPairs : s.period === 'year' ? yearPairs : monthPairs;
  const pmax = Math.max(1, ...pairs.map(p => Math.max(p.i, p.e)));
  const pairBars = pairs.map((p, idx) => {
    const last = idx === pairs.length - 1;
    return { label: p.label, hi: Math.max(2, Math.round(p.i / pmax * 100)), he: Math.max(2, Math.round(p.e / pmax * 100)), op: last ? 1 : 0.45, labelColor: last ? th.tx : th.mu };
  });
  const dayOfYear = daysBetween(new Date(thisYear, 0, 1), today) + 1;
  const kpi = s.period === 'week'
    ? { total: weekTotal, prev: prevWeekTotal, income: sum(weekPairs, p => p.i), saved: topupsIn(W.startIso, W.endIso), perDay: weekTotal / 7, suffix: 'к прошлой' }
    : s.period === 'year'
      ? { total: yearPairs[4].e, prev: yearPairs[3].e, income: yearPairs[4].i, saved: topupsIn(`${thisYear}-01-01`, `${thisYear + 1}-01-01`), perDay: yearPairs[4].e / dayOfYear, suffix: 'к прошлому' }
      : { total: spent, prev: periodSpent(prevP), income, saved: topupsIn(P.startIso, P.endIso), perDay: spent / daysElapsed, suffix: 'к прошлому' };
  const delta = kpi.prev ? Math.round((kpi.total - kpi.prev) / kpi.prev * 100) : null;

  // Задачи
  const view = t => {
    const c = t.cat ? CAT_BY_ID[t.cat] : null;
    return {
      ...t,
      color: c ? c.color : ACCENT, bg: c ? c.bg : th.as,
      costFmt: t.cost ? fmt(t.cost) : 'без затрат',
      costColor: t.cost ? (t.done ? th.mu : th.tx) : th.mu,
      titleStyle: t.done ? 'line-through' : 'none',
      titleColor: t.done ? th.mu : th.tx,
      boxBg: t.done ? GREEN : 'transparent',
      boxBorder: t.done ? GREEN : (dark ? '#3A3746' : '#D5D1E0'),
      checkOpacity: t.done ? 1 : 0,
    };
  };
  const byTime = (a, b) => String(a.time || '').localeCompare(String(b.time || '')) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
  const tasksToday = data.tasks.filter(t => t.date === todayIso).sort(byTime);
  const tasks = tasksToday.map(view);
  const doneCount = tasksToday.filter(t => t.done).length;
  const taskTotal = tasksToday.length;
  const taskPct = pct(doneCount, taskTotal);
  const plannedCost = sum(tasksToday, t => t.cost);
  const spentOnPlan = sum(tasksToday.filter(t => t.done), t => t.cost);

  const tasksP = inP(data.tasks);
  const weekPlan = weekDays.map((d, i) => {
    const total = d.tasks.length;
    const done = d.tasks.filter(t => t.done).length;
    const p = pct(done, total);
    return { label: d.label, done, total, pct: p, h: Math.max(8, p), color: i === W.index ? ACCENT : (total && done === total ? GREEN : th.ip), labelColor: i === W.index ? th.tx : th.mu, ratio: `${done}/${total}` };
  });
  const weekDone = sum(weekPlan, d => d.done);
  const weekTotalTasks = sum(weekPlan, d => d.total);
  const monthDone = tasksP.filter(t => t.done).length;
  const monthTotal = tasksP.length;
  const tagStats = TAGS.map(k => {
    const list = tasksP.filter(t => t.tag === k);
    const done = list.filter(t => t.done).length;
    return { name: k, done, total: list.length, pct: pct(done, list.length), ratio: `${done} из ${list.length}`, color: TAG_COLORS[k][0], bg: dark ? th.as : TAG_COLORS[k][1], letter: k[0] };
  }).filter(t => t.total > 0).sort((a, b) => b.pct - a.pct);
  const byDow = WEEKDAYS_SHORT.map(label => ({ label, done: 0, total: 0 }));
  tasksP.forEach(t => { const i = (parseIso(t.date).getDay() + 6) % 7; byDow[i].total++; if (t.done) byDow[i].done++; });
  const bestDay = byDow.filter(d => d.total > 0).sort((a, b) => (b.done / b.total) - (a.done / a.total))[0] || null;
  const tasksByDate = {};
  data.tasks.forEach(t => { (tasksByDate[t.date] = tasksByDate[t.date] || []).push(t); });
  let streak = 0;
  let cursor = today;
  if (tasksToday.length === 0 || tasksToday.some(t => !t.done)) cursor = addDays(today, -1);
  for (let i = 0; i < 366; i++) {
    const list = tasksByDate[iso(cursor)];
    if (!list || !list.length || list.some(t => !t.done)) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  const skipped = tasksP.filter(t => t.date < todayIso && !t.done).length;

  // Экран добавления траты
  const amountNum = Number(s.amount || 0);
  const picked = CAT_BY_ID[s.cat] || CATS[0];
  const cats = CATS.map(c => ({ ...c, letter: c.name[0], pickBg: s.cat === c.id ? c.bg : th.cd, pickBorder: s.cat === c.id ? c.color : 'transparent' }));

  return {
    dark, th,
    // семья и даты
    greetingName: meName, householdName: household ? household.name : '', inviteCode: household ? household.invite_code || '' : '', membersCount: members.length,
    todayLabel: longLabel(today), todayIso, periodEndLabel: dayMonth(P.end), monthName: MONTHS_NOM[P.start.getMonth()],
    monthStartDay: startDay, nextSalaryLabel: dayMonth(P.end),
    // деньги
    salary, salaryFmt: fmt(salary), incomeRows, income, incomeFmt: fmt(income),
    incomeDeltaText: signed(incomeDelta) + '%', avg6Fmt: fmt(avg6),
    spent, spentFmt: fmt(spent), spentShort: short(spent),
    balanceFmt: fmt(balance), spentPct, daysLeft, perDayLeftFmt: fmt(balance / daysLeft),
    cash, cashFmt: fmt(cash), cashCount: cashTx.length, cashPct,
    card, cardFmt: fmt(card), cardCount: cardTx.length, cardPct,
    // категории и бюджет
    catStats, widgetCats: catStats.slice(0, 3), donut,
    topCatShare: catStats[0].share, topCatName: catStats[0].name,
    overCount: catStats.filter(c => c.spent > c.limit).length,
    budgetTotalFmt: fmt(budgetTotal), budgetLeftFmt: fmt(budgetTotal - spent),
    recentTxs, topTxs, widgetTxs: recentTxs.slice(0, 2), txCount: txs.length,
    // цели
    goals, topGoals: goals.slice(0, 2), wGoal: goals[0] || null, savedTotalFmt: fmt(savedTotal), perMonthFmt: fmt(perMonth),
    // графики
    weekBars, weekBarsDark, weekTotalFmt: fmt(weekTotal), weekDeltaText,
    pairBars, chartTotalFmt: fmt(kpi.total), kpiIncomeFmt: fmt(kpi.income), kpiSavedFmt: fmt(kpi.saved),
    saveRate: pct(kpi.saved, kpi.income),
    deltaText: delta === null ? 'нет данных за прошлый' : `${signed(delta)}% ${kpi.suffix}`,
    deltaColor: delta !== null && delta > 0 ? RED : GREEN,
    perDayFmt: fmt(kpi.perDay),
    // задачи и планы
    tasks, topTasks: tasks.filter(t => !t.done).slice(0, 3),
    widgetTasks: tasks.slice(0, 4).map(t => ({ ...t, wBorder: t.done ? GREEN : '#3A3746', wColor: t.done ? '#7B7889' : '#fff' })),
    doneCount, taskTotal, taskPct, taskRatio: `${doneCount}/${taskTotal}`, todayRatio: `${doneCount} из ${taskTotal}`,
    plannedCostFmt: fmt(plannedCost), leftOnPlanFmt: fmt(plannedCost - spentOnPlan),
    weekPlan, weekPlanPct: pct(weekDone, weekTotalTasks), weekDone, weekDoneRatio: `${weekDone} из ${weekTotalTasks}`,
    monthDone, monthPct: pct(monthDone, monthTotal), monthRatio: `${monthDone} из ${monthTotal}`, skipped,
    tagStats, streak, avgPerDay: (monthDone / daysElapsed).toFixed(1).replace('.', ','),
    bestDayLabel: bestDay ? bestDay.label : '—', bestDayRatio: bestDay ? `${bestDay.done}/${bestDay.total}` : '',
    // добавление траты
    cats, amountNum,
    amountDisplay: amountNum ? fmt(amountNum) : '0\u00A0₸',
    amountColor: amountNum ? th.tx : th.mu,
    pickedCatName: picked.name,
    methodName: s.method === 'cash' ? 'наличные' : 'карта',
    cardPillBg: s.method === 'card' ? ACCENT : th.cd, cardPillFg: s.method === 'card' ? '#fff' : th.mu,
    cashPillBg: s.method === 'cash' ? ACCENT : th.cd, cashPillFg: s.method === 'cash' ? '#fff' : th.mu,
    submitBg: amountNum ? ACCENT : (dark ? '#3A3746' : '#CFCBDB'),
  };
}
