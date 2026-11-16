// Производные значения для экранов и виджетов: всё считается от реальных дат и общих данных семьи.
import { CATS, OTHER_CAT, allCats, TAGS, TAG_COLORS, THEMES, DEFAULT_SETTINGS, fmt, short, traty, mix } from './data.js';
import {
  iso, startOfDay, addDays, daysBetween, inRange, parseIso, periodBounds, weekBounds,
  longLabel, dayMonth, dayLabel, shortDate, MONTHS_NOM, MONTHS_CAP, MONTHS_GEN, WEEKDAYS_SHORT,
} from './lib/dates.js';
import { planBudget } from './lib/autoplan.js';
import { validBills, billDates, billTxId, dueBills, upcomingBills } from './lib/bills.js';
import { settleUp, SPLIT_OPTIONS } from './lib/settle.js';

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
  // Категории: встроенные + свои (кредит, рассрочка…); лимит 0 — без лимита
  // Цвета темы: акцент, приход, расход, внимание (раньше были зашиты фиолетовый, зелёный, красный)
  const ACCENT = th.ac;
  const GREEN = th.gr;
  const RED = th.rd;
  const AMBER = th.am;
  // Категория: icon — ключ линейной иконки (cart, cup…), letter — первая буква (для виджетов и без иконки).
  // В тёмной теме цвет категории светлее; плашки у всех нейтральные (bg = th.ip).
  const themed = c => ({ ...c, color: dark ? mix(c.color, 0.28) : c.color, bg: th.ip, letter: (c.name.trim()[0] || '?').toUpperCase() });
  const catList = allCats(settings).map(c => ({ ...themed(c), limit: Number(limits[c.id]) > 0 ? Number(limits[c.id]) : (c.limit || 0) }));
  const catMap = Object.fromEntries(catList.map(c => [c.id, c]));
  const OTHER_ROW = themed(OTHER_CAT);
  const catOf = id => catMap[id] || OTHER_ROW;
  const visibleCats = catList.filter(c => !c.hidden);
  const members = s.members || [];
  const nameOf = id => { const m = members.find(x => x.user_id === id); return (m && m.display_name) || ''; };
  const membersById = Object.fromEntries(members.map(m => [m.user_id, m.display_name || '']));
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
  // Прошлый период без единой записи (приложением ещё не пользовались) — пустой, а не «зарплата без трат»
  const hasData = Pk => data.txs.some(t => inRange(t.date, Pk.startIso, Pk.endIso)) || data.incomes.some(i => inRange(i.date, Pk.startIso, Pk.endIso));
  const periodIncome = Pk => (Pk.startIso === P.startIso || hasData(Pk) ? salary : 0) + sum(data.incomes.filter(i => inRange(i.date, Pk.startIso, Pk.endIso)), i => i.amount);
  const periodSpent = Pk => sum(data.txs.filter(t => inRange(t.date, Pk.startIso, Pk.endIso)), t => t.amount);

  // Доходы
  const incomesP = inP(data.incomes).sort(byDate);
  const income = periodIncome(P);
  const incomePrev = periodIncome(prevP);
  const incomeDelta = incomePrev ? Math.round((income - incomePrev) / incomePrev * 100) : null;
  const seen6 = [0, 1, 2, 3, 4, 5].map(k => periodBounds(now, startDay, -k)).filter(Pk => Pk.startIso === P.startIso || hasData(Pk));
  const avg6 = Math.round(sum(seen6, periodIncome) / seen6.length);
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

  // Категории с тратами за список операций list (текущий или просматриваемый прошлый месяц)
  const buildCatStats = (rows, total) => [...catList, OTHER_ROW].map(c => {
    const limit = c.limit;
    const list = rows.filter(t => catOf(t.cat).id === c.id);
    const sp = sum(list, t => t.amount);
    const bp = limit ? Math.round(sp / limit * 100) : 0;
    const over = !!limit && sp > limit;
    const warn = !over && bp >= 80;
    return {
      ...c, limit, count: list.length, spent: sp, spentFmt: fmt(sp), spentShort: short(sp),
      share: pct(sp, total), limitFmt: limit ? fmt(limit) : 'без лимита', budgetPct: Math.min(100, bp),
      barColor: over ? RED : warn ? AMBER : c.color,
      status: !limit ? 'Без лимита' : over ? 'Превышено на ' + fmt(sp - limit) : 'Осталось ' + fmt(limit - sp),
      statusColor: over ? RED : warn ? AMBER : th.mu,
    };
  })
    // удалённые свои категории и «Другое» показываем, только пока по ним есть траты
    .filter(c => c.spent > 0 || (!c.hidden && c.id !== OTHER_CAT.id))
    .sort((a, b) => b.spent - a.spent);
  const catStats = buildCatStats(txs, spent);
  let acc = 0;
  const donut = 'conic-gradient(' +
    catStats.map(c => { const from = acc; acc += c.share; return `${c.color} ${from}% ${acc}%`; }).join(', ') +
    (acc < 100 ? `, ${th.ip} ${acc}% 100%` : '') + ')';
  const budgetTotal = sum(catStats, c => c.limit);

  const toTx = t => {
    const c = catOf(t.cat);
    const who = nameOf(t.created_by);
    const methodName = t.method === 'cash' ? 'наличные' : 'карта';
    return {
      ...t, letter: c.letter, icon: c.icon, color: c.color, bg: c.bg, catName: c.name, amountFmt: fmt(t.amount), dateLabel: shortDate(t.date), methodName, author: who,
      meta: `${c.name} · ${methodName} · ${shortDate(t.date)}${who && members.length > 1 ? ' · ' + who : ''}`,
      metaDay: `${c.name} · ${methodName}${who && members.length > 1 ? ' · ' + who : ''}`,
    };
  };
  const recentTxs = [...txs].reverse().slice(0, 6).map(toTx);
  const topTxs = [...txs].sort((a, b) => b.amount - a.amount).slice(0, 3).map(toTx);

  // Цели
  const goals = data.goals.map(g => {
    const p = g.target ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0;
    const months = g.per > 0 ? Math.max(0, Math.ceil((g.target - g.saved) / g.per)) : null;
    return {
      ...g, color: dark ? mix(g.color || '#B48A35', 0.28) : (g.color || '#B48A35'), bg: th.ip, letter: (g.name || 'Ц').trim()[0].toUpperCase(), pct: p,
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
  const prevWeekIncome = (inRange(P.startIso, iso(addDays(W.start, -7)), W.startIso) ? salary : 0)
    + sum(data.incomes.filter(x => inRange(x.date, iso(addDays(W.start, -7)), W.startIso)), x => x.amount);
  const weekDelta = prevWeekTotal ? Math.round((weekTotal - prevWeekTotal) / prevWeekTotal * 100) : null;
  const weekDeltaText = weekDelta === null ? 'первая неделя' : `${weekDelta > 0 ? '+' : weekDelta < 0 ? '−' : ''}${Math.abs(weekDelta)}% к прошлой`;
  const bar = (d, i, dim, dimLabel) => ({ active: i === W.index, label: d.label, h: Math.max(4, Math.round(d.v / weekMax * 100)), color: i === W.index ? ACCENT : dim, labelColor: i === W.index ? (dimLabel ? '#fff' : th.tx) : (dimLabel || th.mu) });
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
    ? { total: weekTotal, prev: prevWeekTotal, income: sum(weekPairs, p => p.i), prevIncome: prevWeekIncome, saved: topupsIn(W.startIso, W.endIso), perDay: weekTotal / 7, suffix: 'к прошлой', noPrev: 'нет данных за прошлую' }
    : s.period === 'year'
      ? { total: yearPairs[4].e, prev: yearPairs[3].e, income: yearPairs[4].i, prevIncome: yearPairs[3].i, saved: topupsIn(`${thisYear}-01-01`, `${thisYear + 1}-01-01`), perDay: yearPairs[4].e / dayOfYear, suffix: 'к прошлому', noPrev: 'нет данных за прошлый' }
      : { total: spent, prev: periodSpent(prevP), income, prevIncome: incomePrev, saved: topupsIn(P.startIso, P.endIso), perDay: spent / daysElapsed, suffix: 'к прошлому', noPrev: 'нет данных за прошлый' };
  const delta = kpi.prev ? Math.round((kpi.total - kpi.prev) / kpi.prev * 100) : null;
  const incDelta = kpi.prevIncome ? Math.round((kpi.income - kpi.prevIncome) / kpi.prevIncome * 100) : null;

  // Задачи: у каждого свои (owner), задачи без владельца видны всем
  const me = s.user ? s.user.id : null;
  const viewTask = t => {
    const c = t.cat ? catMap[t.cat] || null : null;
    return {
      ...t,
      color: c ? c.color : th.at, bg: th.ip,
      ownerName: t.owner ? (membersById[t.owner] || '') : '',
      costFmt: t.cost ? fmt(t.cost) : 'без затрат',
      costColor: t.cost ? (t.done ? th.mu : th.tx) : th.mu,
      titleStyle: t.done ? 'line-through' : 'none',
      titleColor: t.done ? th.mu : th.tx,
      boxBg: t.done ? GREEN : 'transparent',
      boxBorder: t.done ? GREEN : th.off,
      checkOpacity: t.done ? 1 : 0,
    };
  };
  const byTime = (a, b) => String(a.time || '').localeCompare(String(b.time || '')) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
  const forOwner = (list, ownerId) => (ownerId === 'all' ? list : list.filter(t => !t.owner || t.owner === ownerId));
  const tasksByDate = {};
  data.tasks.forEach(t => { (tasksByDate[t.date] = tasksByDate[t.date] || []).push(t); });

  // Статистика списка задач: неделя WB (с выделенным днём) и текущий период
  const planStats = (list, WB, selectedIso) => {
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => {
      const dIso = iso(addDays(WB.start, i));
      const dt = list.filter(t => t.date === dIso);
      const done = dt.filter(t => t.done).length;
      return { iso: dIso, label: WEEKDAYS_SHORT[i], day: parseIso(dIso).getDate(), total: dt.length, done, isToday: dIso === todayIso, selected: dIso === selectedIso };
    });
    const weekPlan = days.map(d => {
      const p = pct(d.done, d.total);
      return { ...d, pct: p, h: Math.max(8, p), ratio: `${d.done}/${d.total}`, color: d.selected ? ACCENT : (d.total && d.done === d.total ? GREEN : th.ip), labelColor: d.selected ? th.tx : th.mu };
    });
    const weekDone = sum(days, d => d.done);
    const weekTotal = sum(days, d => d.total);
    const inPeriod = inP(list);
    const monthDone = inPeriod.filter(t => t.done).length;
    const monthTotal = inPeriod.length;
    const tagStats = TAGS.map(k => {
      const l = inPeriod.filter(t => t.tag === k);
      const done = l.filter(t => t.done).length;
      return { name: k, done, total: l.length, pct: pct(done, l.length), ratio: `${done} из ${l.length}`, color: TAG_COLORS[k][0], bg: dark ? th.as : TAG_COLORS[k][1], letter: k[0] };
    }).filter(t => t.total > 0).sort((a, b) => b.pct - a.pct);
    const byDow = WEEKDAYS_SHORT.map(label => ({ label, done: 0, total: 0 }));
    inPeriod.forEach(t => { const i = (parseIso(t.date).getDay() + 6) % 7; byDow[i].total++; if (t.done) byDow[i].done++; });
    const bestDay = byDow.filter(d => d.total > 0).sort((a, b) => (b.done / b.total) - (a.done / a.total))[0] || null;
    const listByDate = {};
    list.forEach(t => { (listByDate[t.date] = listByDate[t.date] || []).push(t); });
    let streak = 0;
    let cursor = today;
    const todayList = listByDate[todayIso] || [];
    if (todayList.length === 0 || todayList.some(t => !t.done)) cursor = addDays(today, -1);
    for (let i = 0; i < 366; i++) {
      const l = listByDate[iso(cursor)];
      if (!l || !l.length || l.some(t => !t.done)) break;
      streak++;
      cursor = addDays(cursor, -1);
    }
    return {
      weekPlan, weekDone, weekTotal, weekPct: pct(weekDone, weekTotal), weekRatio: `${weekDone} из ${weekTotal}`,
      monthDone, monthTotal, monthPct: pct(monthDone, monthTotal), monthRatio: `${monthDone} из ${monthTotal}`,
      tagStats, bestDayLabel: bestDay ? bestDay.label : '—', bestDayRatio: bestDay ? `${bestDay.done}/${bestDay.total}` : '',
      streak, avgPerDay: (monthDone / daysElapsed).toFixed(1).replace('.', ','),
      skipped: inPeriod.filter(t => t.date < todayIso && !t.done).length,
    };
  };

  // Сегодня, мои задачи — главная, дашборд, виджеты
  const myTasks = forOwner(data.tasks, me);
  const todayMine = myTasks.filter(t => t.date === todayIso).sort(byTime);
  const tasks = todayMine.map(viewTask);
  const doneCount = todayMine.filter(t => t.done).length;
  const taskTotal = todayMine.length;
  const taskPct = pct(doneCount, taskTotal);
  const plannedCost = sum(todayMine, t => t.cost);
  const spentOnPlan = sum(todayMine.filter(t => t.done), t => t.cost);
  const my = planStats(myTasks, W, todayIso);

  // Экран «Планы»: выбранный день, неделя и чей план
  const planDateIso = s.planDate || todayIso;
  const planDate = parseIso(planDateIso);
  const rawOwner = s.planOwner || 'me';
  const ownerId = rawOwner === 'me' || rawOwner === 'all' || membersById[rawOwner] !== undefined ? rawOwner : 'me';
  const ownerTasks = forOwner(data.tasks, ownerId === 'me' ? me : ownerId);
  const PW = weekBounds(planDate);
  const dayTasks = ownerTasks.filter(t => t.date === planDateIso).sort(byTime);
  const planDone = dayTasks.filter(t => t.done).length;
  const planCost = sum(dayTasks, t => t.cost);
  const planSpent = sum(dayTasks.filter(t => t.done), t => t.cost);
  const pwEnd = addDays(PW.start, 6);
  const weekLabel = PW.start.getMonth() === pwEnd.getMonth()
    ? `${PW.start.getDate()}–${pwEnd.getDate()} ${MONTHS_GEN[pwEnd.getMonth()]}`
    : `${PW.start.getDate()} ${MONTHS_GEN[PW.start.getMonth()]} – ${pwEnd.getDate()} ${MONTHS_GEN[pwEnd.getMonth()]}`;
  const plan = {
    dateIso: planDateIso, dateLabel: dayLabel(planDate, today), dateShort: shortDate(planDateIso), isToday: planDateIso === todayIso, weekLabel,
    owners: members.length > 1
      ? [{ id: 'me', name: 'Мои' }, ...members.filter(m => m.user_id !== me).map(m => ({ id: m.user_id, name: m.display_name || 'Партнёр' })), { id: 'all', name: 'Все' }]
      : [],
    ownerId, showOwner: ownerId === 'all', ownerDefault: ownerId === 'me' || ownerId === 'all' ? me : ownerId,
    tasks: dayTasks.map(viewTask), done: planDone, total: dayTasks.length, pct: pct(planDone, dayTasks.length),
    dayRatio: `${planDone} из ${dayTasks.length}`, costFmt: fmt(planCost), leftFmt: fmt(planCost - planSpent),
    hasCost: planCost > 0,
    ...planStats(ownerTasks, PW, planDateIso),
  };

  // Кто сколько потратил (по участникам семьи)
  const MEMBER_COLORS = [[th.at, th.ip], [th.gr, th.ip], [dark ? '#9DB4FF' : '#3E64B8', th.ip], [th.rd, th.ip]];
  const byMember = list => {
    const total = sum(list, t => t.amount);
    const rows = members.map((m, i) => {
      const mine = list.filter(t => t.created_by === m.user_id);
      const sp = sum(mine, t => t.amount);
      return { id: m.user_id, name: m.display_name || 'Без имени', letter: (m.display_name || '?').trim()[0].toUpperCase(), spent: sp, spentFmt: fmt(sp), share: pct(sp, total), count: mine.length, color: MEMBER_COLORS[i % MEMBER_COLORS.length][0], bg: MEMBER_COLORS[i % MEMBER_COLORS.length][1] };
    });
    const rest = total - sum(rows, r => r.spent);
    if (rest > 0) rows.push({ id: 'unknown', name: 'Без автора', letter: '?', spent: rest, spentFmt: fmt(rest), share: pct(rest, total), count: list.filter(t => !membersById[t.created_by]).length, color: th.mu, bg: th.ip });
    return rows.sort((a, b) => b.spent - a.spent);
  };
  const kpiTxs = s.period === 'week' ? txsAll.filter(t => inRange(t.date, W.startIso, W.endIso)) : s.period === 'year' ? txsAll.filter(t => inRange(t.date, `${thisYear}-01-01`, `${thisYear + 1}-01-01`)) : txs;
  const memberStats = byMember(txs);
  const memberStatsPeriod = byMember(kpiTxs);

  // Аналитика: куда уходят деньги за выбранный период (неделя / месяц / год)
  const kpiSpent = sum(kpiTxs, t => t.amount);
  const periodCats = [...catList, OTHER_ROW].map(c => {
    const sp = sum(kpiTxs.filter(t => catOf(t.cat).id === c.id), t => t.amount);
    return { id: c.id, name: c.name, color: c.color, letter: c.letter, icon: c.icon, spent: sp, spentShort: short(sp), share: pct(sp, kpiSpent) };
  }).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent);
  let accP = 0;
  const periodDonut = periodCats.length
    ? 'conic-gradient(' + periodCats.map(c => { const from = accP; accP += c.share; return `${c.color} ${from}% ${accP}%`; }).join(', ') + (accP < 100 ? `, ${th.ip} ${accP}% 100%` : '') + ')'
    : th.ip;

  // Расходы: просматриваемый месяц (shift — сколько зарплатных периодов назад), его категории (они же фильтр)
  // и траты по дням, новые сверху
  const shift = Math.min(0, Math.round(Number(s.shift) || 0));
  const VP = shift ? periodBounds(now, startDay, shift) : P;
  const vTxs = shift ? txsAll.filter(t => inRange(t.date, VP.startIso, VP.endIso)) : txs;
  const vSpent = shift ? sum(vTxs, t => t.amount) : spent;
  const vStats = shift ? buildCatStats(vTxs, vSpent) : catStats;
  const spendCat = s.spendCat && vStats.some(c => c.id === s.spendCat && c.spent > 0) ? s.spendCat : null;
  const spendCats = vStats.filter(c => c.spent > 0).map(c => ({ ...c, selected: c.id === spendCat }));
  const spendDays = [];
  [...vTxs].reverse().filter(t => !spendCat || catOf(t.cat).id === spendCat).forEach(t => {
    let g = spendDays[spendDays.length - 1];
    if (!g || g.iso !== t.date) { g = { iso: t.date, label: dayLabel(parseIso(t.date), today), total: 0, items: [] }; spendDays.push(g); }
    g.total += t.amount;
    g.items.push(toTx(t));
  });
  spendDays.forEach(g => { g.totalFmt = fmt(g.total); });
  const budgetSpentPct = pct(spent, budgetTotal);
  // Пустой месяц: подсказать, когда были последние траты, и открыть тот месяц
  const lastTx = txsAll[txsAll.length - 1] || null;
  const monthOf = Pk => MONTHS_NOM[Pk.start.getMonth()] + (Pk.start.getFullYear() !== today.getFullYear() ? ' ' + Pk.start.getFullYear() : '');
  // Последняя трата раньше месяца Pk → { дата, сколько месяцев назад, название месяца }
  const lastHintFor = Pk => {
    if (!lastTx || lastTx.date >= Pk.startIso) return null;
    for (let k = 1; k <= 36; k++) {
      const Q = periodBounds(now, startDay, -k);
      if (inRange(lastTx.date, Q.startIso, Q.endIso)) return { date: dayMonth(parseIso(lastTx.date)), shift: -k, month: monthOf(Q) };
    }
    return null;
  };
  const capFirst = x => x[0].toUpperCase() + x.slice(1);
  const budgetLeft = budgetTotal - spent;
  const sv = {
    shift, isCurrent: !shift, title: shift ? capFirst(monthOf(VP)) : 'Этот месяц',
    range: `${dayMonth(VP.start)} – ${dayMonth(addDays(VP.end, -1))}`,
    canPrev: txsAll.some(t => t.date < VP.startIso) || data.incomes.some(i => i.date < VP.startIso), canNext: shift < 0,
    spent: vSpent, spentFmt: fmt(vSpent), count: vTxs.length, empty: vTxs.length === 0,
    cashFmt: fmt(sum(vTxs.filter(t => t.method === 'cash'), t => t.amount)), cardFmt: fmt(sum(vTxs.filter(t => t.method !== 'cash'), t => t.amount)),
    say: shift
      ? (vTxs.length ? `${traty(vTxs.length)}, в среднем ${fmt(vSpent / Math.max(1, daysBetween(VP.start, VP.end)))} в день` : '')
      : budgetTotal > 0
        ? (budgetLeft >= 0 ? `Можно ещё ${fmt(budgetLeft)} — примерно ${fmt(budgetLeft / daysLeft)} в день` : `Лимит превышен на ${fmt(-budgetLeft)}`)
        : '',
    over: !shift && budgetTotal > 0 && budgetLeft < 0,
    lastHint: lastHintFor(VP),
  };
  const homeLastHint = lastHintFor(P);

  // Автораспределение: средние траты по категориям за 3 прошлых периода с записями,
  // уже потраченное и затраты невыполненных задач до конца периода
  const spentByCat = list => { const m = {}; list.forEach(t => { const id = catOf(t.cat).id; m[id] = (m[id] || 0) + (t.amount || 0); }); return m; };
  const histPeriods = [1, 2, 3].map(k => periodBounds(now, startDay, -k)).filter(hasData);
  const histTotal = spentByCat(txsAll.filter(t => histPeriods.some(Pk => inRange(t.date, Pk.startIso, Pk.endIso))));
  const plannedByCat = {};
  data.tasks.forEach(t => {
    if (t.done || !t.cat || !(t.cost > 0) || t.date < todayIso || t.date >= P.endIso) return;
    const id = catOf(t.cat).id;
    plannedByCat[id] = (plannedByCat[id] || 0) + t.cost;
  });

  // Регулярные платежи: статус в этом периоде, что пора внести сейчас, ближайшие — для напоминаний
  const bills = validBills(settings.recurring);
  const txIds = new Set(data.txs.map(t => t.id));
  const billPaid = (b, date) => txIds.has(billTxId(b.id, date)) || b.done.includes(date);
  const billRows = bills.map(b => {
    const date = billDates(b.day, P.startIso, P.endIso)[0] || null;
    const active = !!date && (!b.since || date >= b.since);
    const paid = active && billPaid(b, date);
    const c = catOf(b.cat);
    const payer = b.payer ? membersById[b.payer] || '' : '';
    return {
      ...b, letter: (b.title.trim()[0] || '?').toUpperCase(), icon: c.icon, color: c.color, bg: c.bg, catName: c.name, amountFmt: fmt(b.amount),
      date, paid, payerName: payer,
      status: !active ? 'со следующего периода' : paid ? 'внесено' : date === todayIso ? 'сегодня' : shortDate(date),
      statusColor: paid ? GREEN : date === todayIso ? th.at : th.mu,
      meta: `${b.day}-го числа · ${c.name}${payer && members.length > 1 ? ' · ' + payer : ''}`,
    };
  }).sort((a, b) => a.day - b.day);
  // Ещё не внесённые платежи до конца периода — в планах автораспределения, их категории обязательные
  bills.forEach(b => {
    billDates(b.day, P.startIso, P.endIso).forEach(date => {
      if ((b.since && date < b.since) || billPaid(b, date)) return;
      const id = catOf(b.cat).id;
      plannedByCat[id] = (plannedByCat[id] || 0) + b.amount;
    });
  });
  const myId = s.user ? s.user.id : null;
  const billsDue = dueBills(bills, txIds, todayIso).map(x => ({
    id: x.id, title: x.bill.title, cat: x.bill.cat || OTHER_CAT.id, amount: x.bill.amount, method: x.bill.method || 'card', date: x.date,
    created_by: x.bill.payer && membersById[x.bill.payer] !== undefined ? x.bill.payer : myId, billId: x.bill.id,
  }));
  const billReminders = upcomingBills(bills, todayIso).map(x => ({ date: x.date, title: 'Платёж: ' + x.bill.title, body: `${fmt(x.bill.amount)} — трата внесётся в бюджет автоматически` }));
  const billsMonthly = sum(bills, b => b.amount);
  const billsLeft = sum(billRows.filter(b => b.date && !b.paid && b.status !== 'со следующего периода'), b => b.amount);

  const planInput = {
    income, goals: data.goals, cats: catList, spent: spentByCat(txs), planned: plannedByCat, fixedIds: [...new Set(bills.map(b => b.cat).filter(Boolean))],
    history: Object.fromEntries(Object.entries(histTotal).map(([id, v]) => [id, v / histPeriods.length])),
    historyCount: histPeriods.length, daysElapsed, periodDays: daysBetween(P.start, P.end),
  };
  const autoCfg = settings.autoPlan || {};
  const autoSave = Number(autoCfg.save) || 0;
  const autoPlan = planBudget(planInput, autoSave);

  // Предупреждения о лимитах: 80% и больше, превышенные — первыми
  const limitAlerts = catStats.filter(c => c.limit > 0 && c.spent >= c.limit * 0.8).map(c => {
    const p = Math.round(c.spent / c.limit * 100);
    const over = c.spent > c.limit;
    return { id: c.id, name: c.name, color: c.color, bg: c.bg, letter: c.letter, icon: c.icon, pct: p, over, level: over ? 100 : 80,
      text: over ? 'лимит превышен на ' + fmt(c.spent - c.limit) : `${p}% лимита · осталось ${fmt(c.limit - c.spent)}`,
      short: over ? '+' + fmt(c.spent - c.limit) + ' сверх' : `${p}% · осталось ${fmt(c.limit - c.spent)}` };
  }).sort((a, b) => b.pct - a.pct);

  // Остаток прошлого периода → в цель (settings.sweep): доход − траты − уже отложенное в цели
  const sweepCfg = settings.sweep || {};
  const prevLeft = hasData(prevP) ? Math.max(0, periodIncome(prevP) - periodSpent(prevP) - topupsIn(prevP.startIso, prevP.endIso)) : 0;
  const sweepGoal = goals.find(g => g.id === sweepCfg.goalId) || null;
  const sweepClaim = settings.claims && settings.claims.sweep;
  const sweptNow = (sweepCfg.last && sweepCfg.last.period === P.startIso) || (!!sweepClaim && (sweepClaim === P.startIso || sweepClaim.value === P.startIso));
  const sweep = {
    on: !!sweepCfg.on && !!sweepGoal, goalId: sweepGoal ? sweepGoal.id : null, goalName: sweepGoal ? sweepGoal.name : '',
    prevLeft, prevLeftFmt: fmt(prevLeft), prevMonth: MONTHS_NOM[prevP.start.getMonth()],
    swept: !!sweptNow, last: sweepCfg.last || null, lastFmt: sweepCfg.last ? fmt(sweepCfg.last.amount) : '',
    canNow: !!sweepGoal && sweepGoal.pct < 100 && prevLeft > 0 && !sweptNow,
    // skip — включили посреди периода: прошлый остаток откладывается только кнопкой, авто — со следующего
    skip: sweepCfg.skip === P.startIso,
    due: !!sweepCfg.on && !!sweepGoal && sweepGoal.pct < 100 && prevLeft > 0 && !sweptNow && sweepCfg.skip !== P.startIso,
  };

  // Кто кому переводит, чтобы общие траты делились поровну (или в выбранной доле)
  // Считается только после включения (since): раньше один из двоих мог вносить общие траты за всю семью
  const settleCfg = settings.settle || {};
  const settleAvailable = members.length === 2;
  const settleOn = settleAvailable && !!settleCfg.on;
  const settleSince = settleCfg.since || todayIso;
  const settleLog = (Array.isArray(settleCfg.log) ? settleCfg.log : []).filter(x => x.date >= settleSince);
  const st = settleOn ? settleUp(members, data.txs.filter(t => t.date >= settleSince), settings.split, settleLog) : null;
  const nm = m => (m && (m.display_name || 'Партнёр')) || '';
  const settle = st ? {
    sinceLabel: dayMonth(parseIso(settleSince)),
    aId: st.A.user_id, bId: st.B.user_id, aName: nm(st.A), bName: nm(st.B),
    paidAFmt: fmt(st.paidA), paidBFmt: fmt(st.paidB), totalFmt: fmt(st.total),
    settled: st.settled, amount: st.amount, amountFmt: fmt(st.amount),
    fromId: st.from ? st.from.user_id : null, toId: st.to ? st.to.user_id : null, fromName: nm(st.from), toName: nm(st.to),
    options: SPLIT_OPTIONS(nm(st.A), nm(st.B)),
    splitId: (SPLIT_OPTIONS('', '').find(o => Math.abs(o.share - st.shareA) < 0.001) || { id: 'equal' }).id,
    splitLabel: Math.abs(st.shareA - 0.5) < 0.001 ? 'поровну' : `${nm(st.A)} ${Math.round(st.shareA * 100)}% · ${nm(st.B)} ${Math.round((1 - st.shareA) * 100)}%`,
    log: [...settleLog].slice(-4).reverse().map(x => ({ ...x, text: `${shortDate(x.date)} · ${membersById[x.from] || '?'} → ${membersById[x.to] || '?'}`, amountFmt: fmt(x.amount) })),
  } : null;

  // Экран добавления траты
  const amountNum = Number(s.amount || 0);
  const picked = visibleCats.find(c => c.id === s.cat) || catMap[CATS[0].id];
  const cats = visibleCats.map(c => ({ ...c, pickBg: picked.id === c.id ? c.bg : th.cd, pickBorder: picked.id === c.id ? c.color : 'transparent' }));

  return {
    dark, th,
    // семья и даты
    greetingName: meName, householdName: household ? household.name : '', inviteCode: household ? household.invite_code || '' : '', membersCount: members.length,
    membersById, memberStats, memberStatsPeriod,
    todayLabel: longLabel(today), todayIso, periodLabel: `${dayMonth(P.start)} – ${dayMonth(addDays(P.end, -1))}`, periodEndLabel: dayMonth(P.end), monthName: MONTHS_NOM[P.start.getMonth()],
    monthStartDay: startDay, nextSalaryLabel: dayMonth(P.end),
    // деньги
    salary, salaryFmt: fmt(salary), incomeRows, income, incomeFmt: fmt(income),
    incomeDeltaText: incomeDelta === null ? '' : signed(incomeDelta) + '%', avg6Fmt: fmt(avg6),
    spent, spentFmt: fmt(spent), spentShort: short(spent),
    balanceFmt: fmt(balance), spentPct, daysLeft, perDayLeftFmt: fmt(balance / daysLeft),
    cash, cashFmt: fmt(cash), cashCount: cashTx.length, cashPct,
    card, cardFmt: fmt(card), cardCount: cardTx.length, cardPct,
    // категории и бюджет
    catStats, widgetCats: catStats.slice(0, 3), donut,
    topCatShare: catStats[0].share, topCatName: catStats[0].name,
    overCount: catStats.filter(c => c.spent > c.limit).length,
    budgetTotal, budgetTotalFmt: fmt(budgetTotal), budgetLeftFmt: fmt(budgetTotal - spent),
    budgetSpentPct: Math.min(100, budgetSpentPct), budgetBarColor: budgetSpentPct > 100 ? RED : budgetSpentPct >= 80 ? AMBER : ACCENT,
    spendCats, spendDays, spendCatName: spendCat ? catOf(spendCat).name : '',
    // автораспределение
    planInput, autoPlan, autoSave, autoOn: !!autoCfg.on, autoPeriod: autoCfg.period || null, periodStartIso: P.startIso,
    // регулярные платежи, лимиты, остаток в цель, расчёты
    billRows, billsDue, billReminders, billsMonthlyFmt: fmt(billsMonthly), billsLeftFmt: fmt(billsLeft), billsLeft,
    limitAlerts, sweep, settle, settleAvailable, settleOn, sv, homeLastHint,
    nextBill: (() => { const b = billRows.filter(x => x.date && !x.paid && x.status !== 'со следующего периода').sort((p, q) => (p.date < q.date ? -1 : 1))[0]; return b ? { title: b.title, date: dayMonth(parseIso(b.date)), amountFmt: b.amountFmt } : null; })(),
    nextBillText: (() => { const b = billRows.filter(x => x.date && !x.paid && x.status !== 'со следующего периода').sort((p, q) => (p.date < q.date ? -1 : 1))[0]; return b ? shortDate(b.date) + ' · ' + b.title : billRows.length ? 'всё внесено' : 'добавить'; })(),
    periodCats, periodDonut, periodWord: s.period === 'week' ? 'за неделю' : s.period === 'year' ? 'за год' : 'за месяц',
    recentTxs, topTxs, widgetTxs: recentTxs.slice(0, 2), txCount: txs.length,
    // цели
    goals, topGoals: goals.slice(0, 2), wGoal: goals[0] || null, savedTotalFmt: fmt(savedTotal), perMonthFmt: fmt(perMonth),
    // графики
    weekBars, weekBarsDark, weekTotalFmt: fmt(weekTotal), weekDeltaText,
    pairBars, chartTotalFmt: fmt(kpi.total), kpiIncomeFmt: fmt(kpi.income), kpiSavedFmt: fmt(kpi.saved),
    saveRate: pct(kpi.saved, kpi.income),
    // ещё ничего не внесли — не «−100%», а честное «пока нет трат»
    deltaText: kpi.total === 0 ? 'пока нет трат' : delta === null ? kpi.noPrev : `${signed(delta)}% ${kpi.suffix}`,
    deltaColor: kpi.total === 0 || delta === null ? th.mu : delta > 0 ? RED : GREEN,
    kpiIncomeDeltaText: incDelta === null ? kpi.noPrev : `${signed(incDelta)}% ${kpi.suffix}`,
    kpiIncomeDeltaColor: incDelta === null ? th.mu : incDelta < 0 ? RED : GREEN,
    perDayFmt: fmt(kpi.perDay),
    // задачи и планы (сегодня, мои)
    tasks, topTasks: tasks.filter(t => !t.done).slice(0, 3),
    widgetTasks: tasks.slice(0, 4).map(t => ({ ...t, wBorder: t.done ? GREEN : '#3A3746', wColor: t.done ? '#7B7889' : '#fff' })),
    doneCount, taskTotal, taskPct, taskRatio: `${doneCount}/${taskTotal}`, todayRatio: `${doneCount} из ${taskTotal}`,
    plannedCostFmt: fmt(plannedCost), leftOnPlanFmt: fmt(plannedCost - spentOnPlan),
    weekPlan: my.weekPlan, weekPlanPct: my.weekPct, weekDone: my.weekDone, weekDoneRatio: my.weekRatio,
    monthDone: my.monthDone, monthPct: my.monthPct, monthRatio: my.monthRatio, skipped: my.skipped,
    tagStats: my.tagStats, streak: my.streak, avgPerDay: my.avgPerDay, bestDayLabel: my.bestDayLabel, bestDayRatio: my.bestDayRatio,
    plan, me, members: members.map(m => ({ id: m.user_id, name: m.display_name || '' })),
    // добавление траты
    cats, catNames: Object.fromEntries(catList.map(c => [c.id, c.name])), amountNum,
    amountDisplay: amountNum ? fmt(amountNum) : '0\u00A0₸',
    amountColor: amountNum ? th.tx : th.mu,
    pickedCatName: picked.name, catAuto: !!s.catAuto,
    methodName: s.method === 'cash' ? 'наличные' : 'карта',
    cardPillBg: s.method === 'card' ? ACCENT : th.cd, cardPillFg: s.method === 'card' ? th.on : th.mu,
    cashPillBg: s.method === 'cash' ? ACCENT : th.cd, cashPillFg: s.method === 'cash' ? th.on : th.mu,
    submitBg: amountNum ? ACCENT : th.off, submitFg: amountNum ? th.on : th.mu,
  };
}
