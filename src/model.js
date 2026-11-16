// Производные значения для экранов и виджетов: всё считается от реальных дат и общих данных семьи.
import { CATS, OTHER_CAT, allCats, TAGS, TAG_COLORS, THEMES, DEFAULT_SETTINGS, fmt, short, traty, mix, plural } from './data.js';
import { SHOP_GROUPS, weekKey, shoppingFromMenu, creditView, utilitiesView } from './lib/family.js';
import { validChores, occursOn, assigneeOf, stateOf, repeatLabel } from './lib/chores.js';
import {
  iso, startOfDay, addDays, daysBetween, inRange, parseIso, periodBounds, weekBounds,
  longLabel, dayMonth, dayLabel, shortDate, MONTHS_NOM, MONTHS_CAP, MONTHS_GEN, WEEKDAYS_SHORT, WEEKDAYS,
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
  // Зарплаты: у каждого своя (settings.salaries[userId]) плюс старая общая (settings.salary) — все приходят в начале периода
  const salaries = settings.salaries && typeof settings.salaries === 'object' ? settings.salaries : {};
  const salaryOwn = Object.entries(salaries).map(([id, v]) => [id, Math.max(0, Math.round(Number(v) || 0))]).filter(([, v]) => v > 0);
  const legacySalary = Math.max(0, Number(settings.salary) || 0);
  const salary = legacySalary + salaryOwn.reduce((a, [, v]) => a + v, 0);
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
  const themed = c => ({ ...c, color: dark ? (c.dark || mix(c.color, 0.4)) : c.color, bg: th.ip, letter: (c.name.trim()[0] || '?').toUpperCase() });
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
  // в текущем периоде считаем только пришедшее (дата не позже сегодня); будущие — в «Ожидается»
  const periodIncome = Pk => (Pk.startIso === P.startIso || hasData(Pk) ? salary : 0) + sum(data.incomes.filter(i => inRange(i.date, Pk.startIso, Pk.endIso) && (Pk.startIso !== P.startIso || i.date <= todayIso)), i => i.amount);
  const periodSpent = Pk => sum(data.txs.filter(t => inRange(t.date, Pk.startIso, Pk.endIso)), t => t.amount);

  // Доходы
  const incomesP = inP(data.incomes).sort(byDate);
  const income = periodIncome(P);
  const incomePrev = periodIncome(prevP);
  const incomeDelta = incomePrev ? Math.round((income - incomePrev) / incomePrev * 100) : null;
  const seen6 = [0, 1, 2, 3, 4, 5].map(k => periodBounds(now, startDay, -k)).filter(Pk => Pk.startIso === P.startIso || hasData(Pk));
  const avg6 = Math.round(sum(seen6, periodIncome) / seen6.length);
  // Кто получил разовый доход: settings.incomeBy[id] (в таблице доходов нет поля автора)
  const incomeBy = settings.incomeBy && typeof settings.incomeBy === 'object' ? settings.incomeBy : {};
  const whoOfIncome = i => incomeBy[i.id] || i.created_by || null;
  const incomeRow = i => {
    const who = whoOfIncome(i);
    return {
      ...i, kind: 'income', who, letter: (i.title || 'Д').trim()[0].toUpperCase(), name: i.title,
      meta: `${who && nameOf(who) ? nameOf(who) + ' · ' : ''}${dayMonth(parseIso(i.date))}`,
      sub: i.method === 'cash' ? 'наличные' : 'карта', amountFmt: fmt(i.amount),
    };
  };
  const incomeRows = [
    ...salaryOwn.map(([id, v]) => ({ id: 'salary-' + id, kind: 'salary', who: id, letter: 'З', name: 'Зарплата', meta: `${nameOf(id) || 'Участник'} · ${dayMonth(P.start)}`, sub: 'каждый месяц', amount: v, amountFmt: fmt(v) })),
    ...(legacySalary > 0 ? [{ id: 'salary', kind: 'salary', who: null, letter: 'З', name: 'Зарплата', meta: dayMonth(P.start), sub: 'каждый месяц', amount: legacySalary, amountFmt: fmt(legacySalary) }] : []),
    ...incomesP.filter(i => i.date <= todayIso).map(incomeRow),
  ];
  // Ожидается: доходы с датой позже сегодняшней в этом периоде
  const incomeExpected = incomesP.filter(i => i.date > todayIso).map(incomeRow);
  const incomeMembers = members.map((m, idx) => ({
    id: m.user_id, name: m.display_name || 'Участник', color: [th.at, th.gr, th.lv, th.bl][idx % 4],
    amount: (Number(salaries[m.user_id]) || 0) + sum(incomesP.filter(x => whoOfIncome(x) === m.user_id), x => x.amount),
  })).map(x => ({ ...x, amountFmt: fmt(x.amount) }));

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

  // Цвет участника: первый — золото, второй — зелёный (как аватары в макете), дальше лавандовый, голубой
  const memberIdx = Object.fromEntries(members.map((m, i) => [m.user_id, i]));
  const memberColor = id => (memberIdx[id] === undefined ? th.mu : [th.at, th.gr, th.lv, th.bl][memberIdx[id] % 4]);
  const toTx = t => {
    const c = catOf(t.cat);
    const who = nameOf(t.created_by);
    const methodName = t.method === 'cash' ? 'наличные' : 'карта';
    const multi = members.length > 1;
    return {
      ...t, letter: c.letter, icon: c.icon, color: c.color, bg: c.bg, catName: c.name, amountFmt: fmt(t.amount), dateLabel: shortDate(t.date), methodName, author: who,
      whoLetter: multi && who ? who.trim()[0].toUpperCase() : '', whoColor: memberColor(t.created_by),
      meta: `${c.name}${who && multi ? ' · ' + who : ''} · ${methodName} · ${shortDate(t.date)}`,
      metaDay: `${c.name}${who && multi ? ' · ' + who : ''} · ${methodName}`,
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
  // Планёрка: дела из settings.chores превращаются во «вхождения» по датам и считаются вместе с задачами из таблицы
  const chores = validChores(settings.chores);
  const choreLog = settings.choreLog && typeof settings.choreLog === 'object' ? settings.choreLog : {};
  const memberIds = members.map(m => m.user_id).sort();
  const occOf = (c, dIso) => {
    const st0 = stateOf(c, choreLog, dIso);
    const whoId = assigneeOf(c, dIso, memberIds);
    return {
      id: `ch:${c.id}:${dIso}`, chore: c, choreId: c.id, name: c.name, date: dIso, time: c.time, done: st0.done, subsDone: st0.subsDone,
      owner: whoId && whoId !== 'together' && membersById[whoId] !== undefined ? whoId : null, together: whoId === 'together',
      where: c.where || '', freq: c.freq, tag: '', cost: 0, cat: null,
    };
  };
  const occRange = (fromIso, toIso, pick) => { // [from, to)
    const out = [];
    for (let dte = parseIso(fromIso); iso(dte) < toIso; dte = addDays(dte, 1)) {
      const dIso = iso(dte);
      chores.forEach(c => { if ((!pick || pick(c)) && occursOn(c, dIso)) out.push(occOf(c, dIso)); });
    }
    return out;
  };
  const winFrom = [prevP.startIso, iso(addDays(today, -62))].sort()[0];
  const winTo = [P.endIso, iso(addDays(today, 36))].sort()[1];
  const allTasks = chores.length ? [...data.tasks, ...occRange(winFrom, winTo)] : data.tasks;

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
  const myTasks = forOwner(allTasks, me);
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
  const ownerTasks = forOwner(allTasks, ownerId === 'me' ? me : ownerId);
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

  // Экран «Планёрка» (макет, шаг 3): день, неделя, месяц
  const whoName = t => (t.together ? 'Вместе' : t.owner ? (membersById[t.owner] || '') : '');
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const timedSort = (x, y) => (x.time ? 0 : 1) - (y.time ? 0 : 1) || byTime(x, y);
  const dayItemsOf = dIso => [...data.tasks.filter(t => t.date === dIso), ...chores.filter(c => occursOn(c, dIso)).map(c => occOf(c, dIso))].sort(timedSort);
  const perPerson = list => members.map(m => ({ name: m.display_name || '?', n: list.filter(t => t.owner === m.user_id).length })).filter(x => x.n > 0).map(x => `${x.name} ${x.n}`).join(' · ');
  const lowerFirst = x => (x ? x[0].toLowerCase() + x.slice(1) : x);
  const planView = s.planView === 'week' || s.planView === 'month' ? s.planView : 'day';
  const wdOf = dIso => WEEKDAYS_SHORT[(parseIso(dIso).getDay() + 6) % 7].toLowerCase();
  const refOf = t => ({ choreId: t.choreId || null, taskId: t.chore ? null : t.id, dateIso: t.date, hasSubs: !!(t.chore && t.chore.subs.length), raw: t.chore ? null : t });

  const dayItems = dayItemsOf(planDateIso);
  let hotGiven = false;
  const dayRows = dayItems.map(t => {
    const hot = !t.done && planDateIso === todayIso && !!t.time && t.time >= nowHM && !hotGiven;
    if (hot) hotGiven = true;
    return {
      key: t.id, name: t.name, done: !!t.done, ...refOf(t), hot,
      sub: [whoName(t), t.chore ? (t.where || repeatLabel(t.chore)) : (t.tag || '')].filter(Boolean).join(' · '),
      right: t.chore && t.chore.subs.length ? `${t.subsDone.length} из ${t.chore.subs.length}` : (t.time || (t.cost ? fmt(t.cost) : '—')),
    };
  });
  const tomorrowIso = iso(addDays(planDate, 1));
  const tmr = chores.filter(c => c.freq !== 'day' && occursOn(c, tomorrowIso)).map(c => occOf(c, tomorrowIso)).sort((x, y) => (y.chore.rotate ? 1 : 0) - (x.chore.rotate ? 1 : 0))[0] || null;
  const dayDone = dayItems.filter(t => t.done).length;

  // «На неделю» — без ежедневной рутины (каждый день и по будням): она живёт на вкладке «День»
  const routine = t => !!t.chore && (t.freq === 'day' || (t.freq === 'week' && t.chore.days.length >= 5));
  const weekOcc = [0, 1, 2, 3, 4, 5, 6].map(i => dayItemsOf(iso(addDays(PW.start, i))).filter(t => !routine(t)));
  const weekFlat = weekOcc.flat();
  const weekRows = [];
  const seenChore = new Set();
  weekFlat.forEach(t => {
    if (t.chore && t.freq === 'week') {
      if (seenChore.has(t.choreId)) return;
      seenChore.add(t.choreId);
      const c = t.chore;
      const occs = weekFlat.filter(x => x.choreId === t.choreId);
      const doneN = occs.filter(x => x.done).length;
      const next = occs.find(x => !x.done) || occs[occs.length - 1];
      weekRows.push({
        key: 'c' + c.id, name: c.name, done: c.subs.length ? t.done : doneN === occs.length, ...refOf(next),
        sub: [repeatLabel(c), whoName(next), c.where].filter(Boolean).join(' · '),
        right: c.subs.length ? `${t.subsDone.length} из ${c.subs.length}` : occs.length > 1 ? `${doneN} из ${occs.length}` : wdOf(next.date),
        pct: c.subs.length ? pct(t.subsDone.length, c.subs.length) : occs.length > 1 ? pct(doneN, occs.length) : null,
      });
    } else {
      weekRows.push({ key: t.id, name: t.name, done: !!t.done, ...refOf(t), sub: [t.time, whoName(t), t.where].filter(Boolean).join(' · '), right: wdOf(t.date), pct: null });
    }
  });

  const monthItems = [...inP(data.tasks), ...occRange(P.startIso, P.endIso, c => c.freq === 'month' || c.freq === 'once')].sort(byDate);
  const monthRows = monthItems.map(t => {
    const dte = parseIso(t.date);
    const diff = daysBetween(today, dte);
    const base = (t.chore && t.freq === 'month' ? 'до ' : '') + dayMonth(dte) + (t.chore && t.freq === 'month' ? '' : ', ' + WEEKDAYS[dte.getDay()].toLowerCase());
    const soon = !t.done && diff <= 5;
    const tail = t.done ? '' : diff < 0 ? ' · просрочено' : diff === 0 ? ' · сегодня' : diff === 1 ? ' · завтра' : diff <= 5 ? ` · через ${diff} ${plural(diff, 'день', 'дня', 'дней')}` : '';
    return { key: t.id, name: t.name, done: !!t.done, ...refOf(t), sub: base + tail, hot: soon, right: whoName(t) };
  });
  const monthDoneN = monthItems.filter(t => t.done).length;
  const pl = {
    view: planView, dateIso: planDateIso, isToday: planDateIso === todayIso, empty: chores.length === 0 && data.tasks.length === 0,
    day: {
      label: longLabel(planDate), rows: dayRows, done: dayDone, total: dayItems.length, people: perPerson(dayItems),
      segments: dayItems.map((_, i) => i < dayDone),
      note: tmr ? `${planDateIso === todayIso ? 'Завтра' : dayMonth(addDays(planDate, 1))} — ${lowerFirst(tmr.name)}. ${tmr.together ? 'Делаете вместе' : whoName(tmr) ? (tmr.chore.rotate ? 'Очередь: ' : 'Делает ') + whoName(tmr) : 'Кто свободен'}.` : '',
    },
    week: {
      label: PW.start.getMonth() === pwEnd.getMonth() ? `${PW.start.getDate()} – ${pwEnd.getDate()} ${MONTHS_GEN[pwEnd.getMonth()]}` : `${dayMonth(PW.start)} – ${dayMonth(pwEnd)}`,
      total: weekFlat.length, done: weekFlat.filter(t => t.done).length, rows: weekRows,
      strip: weekOcc.map((list, i) => {
        const dIso = iso(addDays(PW.start, i));
        return { iso: dIso, wd: WEEKDAYS_SHORT[i].toLowerCase(), day: parseIso(dIso).getDate(), isToday: dIso === todayIso, selected: dIso === planDateIso, dots: list.slice(0, 3).map(t => (t.done ? th.gr : th.ac)) };
      }),
    },
    month: {
      label: `${MONTHS_NOM[P.start.getMonth()].replace(/^./, x => x.toUpperCase())} · ${dayMonth(P.start)} – ${dayMonth(addDays(P.end, -1))}`,
      done: monthDoneN, total: monthItems.length, pct: pct(monthDoneN, monthItems.length), people: perPerson(monthItems),
      left: monthRows.filter(r => !r.done), finished: monthRows.filter(r => r.done),
    },
  };
  // Напоминания о делах: ближайшие 14 дней, мои и общие, с указанным временем
  const choreReminders = [];
  if (chores.some(c => c.time)) {
    for (let i = 0; i < 14; i++) {
      const dIso = iso(addDays(today, i));
      chores.forEach(c => {
        if (!c.time || !occursOn(c, dIso)) return;
        const o = occOf(c, dIso);
        if (o.done || (o.owner && o.owner !== me)) return;
        choreReminders.push({ date: dIso, time: c.time, title: 'Планёрка', body: c.name + (c.where ? ' · ' + c.where : '') });
      });
    }
  }

  // Кто сколько потратил (по участникам семьи)
  const byMember = list => {
    const total = sum(list, t => t.amount);
    const rows = members.map((m, i) => {
      const mine = list.filter(t => t.created_by === m.user_id);
      const sp = sum(mine, t => t.amount);
      return { id: m.user_id, name: m.display_name || 'Без имени', letter: (m.display_name || '?').trim()[0].toUpperCase(), spent: sp, spentFmt: fmt(sp), share: pct(sp, total), count: mine.length, color: memberColor(m.user_id), bg: th.ip, isMe: !!s.user && m.user_id === s.user.id };
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
  // Фильтры «Расходов»: кто потратил (spendWho) и поиск по названию и категории (spendQuery)
  const spendWho = s.spendWho && membersById[s.spendWho] !== undefined ? s.spendWho : null;
  const q = String(s.spendQuery || '').trim().toLowerCase().replace(/ё/g, 'е');
  const matchQ = t => !q || [t.title, catOf(t.cat).name].some(x => String(x || '').toLowerCase().replace(/ё/g, 'е').includes(q));
  const vFiltered = vTxs.filter(t => (!spendCat || catOf(t.cat).id === spendCat) && (!spendWho || t.created_by === spendWho) && matchQ(t));
  const spendDays = [];
  [...vFiltered].reverse().forEach(t => {
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

  // «Аналитика» (Ещё): месяц / полгода / год — средние траты, столбики периодов, сравнение с прошлым месяцем
  const MONTHS_INS = ['январём', 'февралём', 'мартом', 'апрелем', 'маем', 'июнем', 'июлем', 'августом', 'сентябрём', 'октябрём', 'ноябрём', 'декабрём'];
  const anRange = s.anRange === 'half' || s.anRange === 'year' ? s.anRange : 'month';
  const anN = anRange === 'year' ? 12 : 6;
  const anVals = Array.from({ length: anN }, (_, i) => periodBounds(now, startDay, -(anN - 1 - i)))
    .map(Pk => ({ v: periodSpent(Pk), label: MONTHS_CAP[Pk.start.getMonth()].toLowerCase(), current: Pk.startIso === P.startIso }));
  const anSeen = anVals.filter(x => x.v > 0 && !x.current);
  const anValue = anRange === 'month' ? spent : (anSeen.length ? sum(anSeen, x => x.v) / anSeen.length : spent);
  const anMax = Math.max(1, ...anVals.map(x => x.v));
  const prevTxs = txsAll.filter(t => inRange(t.date, prevP.startIso, prevP.endIso));
  const catSum = (list, id) => sum(list.filter(t => catOf(t.cat).id === id), t => t.amount);
  const analytics = {
    range: anRange,
    title: anRange === 'month' ? 'Потрачено за этот месяц' : anRange === 'half' ? 'В среднем тратим за месяц · полгода' : 'В среднем тратим за месяц · год',
    valueFmt: fmt(anValue),
    bars: anVals.map(x => ({ ...x, h: Math.max(4, Math.round(x.v / anMax * 100)), valueShort: x.v ? short(x.v) : '' })),
    compareTitle: `По сравнению с ${MONTHS_INS[prevP.start.getMonth()]}`,
    compare: [...catList, OTHER_ROW].map(c => {
      const cur = catSum(txs, c.id);
      const prev = catSum(prevTxs, c.id);
      if (!cur && !prev) return null;
      const dp = prev ? Math.round((cur - prev) / prev * 100) : null;
      return {
        id: c.id, name: c.name, color: c.color, icon: c.icon, letter: c.letter, cur, curFmt: fmt(cur),
        deltaText: dp === null ? 'новое' : `${dp > 0 ? '+' : dp < 0 ? '−' : ''}${Math.abs(dp)}%`,
        deltaColor: dp === null || dp === 0 ? th.mu : dp > 0 ? th.rd : th.gr,
      };
    }).filter(Boolean).sort((a, b) => b.cur - a.cur),
  };

  // «Цели» (Планы): сколько отложено всего и в этом месяце, у каждой цели — идёт ли по графику
  const periodDays = daysBetween(P.start, P.end);
  const goalCards = goals.map(g => {
    const month = sum((g.topups || []).filter(t => inRange(t.date, P.startIso, P.endIso)), t => t.amount);
    const per = Number(g.per) || 0;
    let planText = 'Без плана пополнений';
    let planColor = th.mu;
    if (g.pct >= 100) { planText = 'Цель достигнута'; planColor = th.gr; }
    else if (per > 0 && month >= per) { planText = `В графике · ${fmt(per)} в месяц`; planColor = th.gr; }
    else if (per > 0 && daysElapsed > periodDays / 2) { planText = `Отстаёте на ${fmt(per - month)}`; planColor = th.rd; }
    else if (per > 0) { planText = `В этом месяце ещё ${fmt(per - month)}`; }
    return { ...g, planText, planColor, monthFmt: fmt(month) };
  });

  // «Платежи» (Планы): неделя с отметками дней списаний
  const billWeek = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const dIso = iso(addDays(W.start, i));
    const next = iso(addDays(W.start, i + 1));
    return {
      iso: dIso, label: WEEKDAYS_SHORT[i].toLowerCase(), day: parseIso(dIso).getDate(), isToday: dIso === todayIso,
      has: bills.some(b => billDates(b.day, dIso, next).length > 0 && (!b.since || dIso >= b.since)),
    };
  });
  const memberAvatars = members.map(m => ({ id: m.user_id, letter: (m.display_name || '?').trim()[0].toUpperCase(), color: memberColor(m.user_id), name: m.display_name || '' }));

  // ── Семейные разделы (макет, шаг 5): данные в settings ─────────────────────
  const arr = x => (Array.isArray(x) ? x : []);
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const me2 = s.user ? s.user.id : null;
  const productsWord = n => plural(n, 'продукт', 'продукта', 'продуктов');
  const num0 = x => Math.max(0, Number(x) || 0);
  const MONTHS_DAT = ['январю', 'февралю', 'марту', 'апрелю', 'маю', 'июню', 'июлю', 'августу', 'сентябрю', 'октябрю', 'ноябрю', 'декабрю'];

  // Покупки: список с группами; кто сейчас отмечает (последняя отметка за 15 минут)
  const shop = obj(settings.shop);
  const shopItems = arr(shop.items).filter(x => x && x.id && x.name);
  const shopGroupsOrder = [...SHOP_GROUPS, ...[...new Set(shopItems.map(x => x.group || 'Другое'))].filter(g => !SHOP_GROUPS.includes(g))];
  const shopGroups = shopGroupsOrder.map(g => ({
    name: g,
    items: shopItems.filter(x => (x.group || 'Другое') === g).map(x => ({
      ...x, priceFmt: x.price ? (x.done ? '' : '≈ ') + fmt(x.price).replace('\u00A0₸', '') : '',
      sub: [x.note, x.by && x.by !== me2 && nameOf(x.by) ? 'от ' + nameOf(x.by) : ''].filter(Boolean).join(' · '),
    })),
  })).filter(g => g.items.length);
  const shopLast = obj(shop.last);
  const shopping = {
    groups: shopGroups, total: shopItems.length, done: shopItems.filter(x => x.done).length,
    sumFmt: fmt(sum(shopItems, x => num0(x.price))), doneSum: sum(shopItems.filter(x => x.done), x => num0(x.price)),
    presence: shopLast.by && shopLast.by !== me2 && now.getTime() - Number(shopLast.at || 0) < 15 * 60000 && nameOf(shopLast.by)
      ? `${nameOf(shopLast.by)} сейчас отмечает покупки` : '',
  };
  shopping.pct = pct(shopping.done, shopping.total);
  shopping.doneSumFmt = fmt(shopping.doneSum);

  // Меню на неделю (ужины): блюдо, кто готовит, каких продуктов не хватает → «Собрать список покупок»
  const menuAll = obj(settings.menu);
  const menuWeekIso = /^\d{4}-\d{2}-\d{2}$/.test(s.menuWeek || '') ? s.menuWeek : weekKey(todayIso);
  const menuWeek = obj(menuAll[menuWeekIso]);
  const menuStart = parseIso(menuWeekIso);
  const menuEnd = addDays(menuStart, 6);
  const menuNeed = shoppingFromMenu(menuWeek, shopItems);
  const foodCat = catStats.find(c => c.id === 'food');
  const menuNeedSum = sum(menuNeed, x => x.price);
  const menu = {
    weekIso: menuWeekIso, isThisWeek: menuWeekIso === weekKey(todayIso),
    label: menuStart.getMonth() === menuEnd.getMonth() ? `${menuStart.getDate()} – ${menuEnd.getDate()} ${MONTHS_GEN[menuEnd.getMonth()]}` : `${dayMonth(menuStart)} – ${dayMonth(menuEnd)}`,
    people: Math.max(1, Number(obj(settings.menuPrefs).people) || Math.max(2, members.length)),
    days: [0, 1, 2, 3, 4, 5, 6].map(i => {
      const day = obj(menuWeek[i]);
      const dIso = iso(addDays(menuStart, i));
      const need = arr(day.need);
      const cook = day.cook === 'together' ? 'вместе' : day.cook ? nameOf(day.cook) : '';
      return {
        idx: i, iso: dIso, wd: WEEKDAYS_SHORT[i].toUpperCase(), isToday: dIso === todayIso, dish: day.dish || '', cook: day.cook || null, need,
        needCount: need.length,
        sub: day.dish ? [cook ? (day.cook === 'together' ? 'вместе' : 'готовит ' + cook) : '', need.length ? `нужно ${need.length} ${productsWord(need.length)}` : 'всё есть'].filter(Boolean).join(' · ') : '',
      };
    }),
    needCount: menuNeed.length, needSumFmt: fmt(menuNeedSum),
    foodLeftText: !(foodCat && foodCat.limit) ? '' : (foodCat.limit - foodCat.spent - menuNeedSum >= 0
      ? `лимит «Продукты» остаётся ${fmt(foodCat.limit - foodCat.spent - menuNeedSum)}`
      : `лимит «Продукты» будет превышен на ${fmt(menuNeedSum + foodCat.spent - foodCat.limit)}`),
  };

  // Кредиты: сколько осталось, в месяц, переплата; подсказка про досрочный платёж
  const creditList = arr(settings.credits).filter(c => c && c.id && c.name).map(c => creditView(c, todayIso)).map((c, i) => ({
    ...c, color: [th.ac, th.gr, th.lv, th.bl][i % 4], leftFmt: fmt(c.left), monthlyFmt: fmt(c.monthly), overpayFmt: fmt(c.overpay),
    nextLabel: dayMonth(parseIso(c.nextIso)), rateText: c.rate ? `${c.rate}% годовых` : '',
  }));
  const earlyOf = creditList.map(c => ({ c, e: c.early(100000) })).filter(x => x.e && x.e.saved > 0).sort((a, b) => b.e.saved - a.e.saved)[0] || null;
  const credits = {
    list: creditList, leftFmt: fmt(sum(creditList, c => c.left)), monthlyFmt: fmt(sum(creditList, c => c.monthly)), overpayFmt: fmt(sum(creditList, c => c.overpay)),
    tip: earlyOf ? { id: earlyOf.c.id, amountFmt: fmt(earlyOf.e.amount), savedFmt: fmt(earlyOf.e.saved), months: earlyOf.e.months } : null,
  };

  // Коммуналка: счётчики, постоянные платежи, сумма к оплате и история по месяцам
  const uv = utilitiesView(settings.utilities, todayIso);
  const dueDate = (() => { const t = today; let d = new Date(t.getFullYear(), t.getMonth(), uv.due); if (iso(d) < todayIso) d = new Date(t.getFullYear(), t.getMonth() + 1, uv.due); return d; })();
  const uMax = Math.max(1, ...uv.history.map(h => h.value), uv.total);
  const utilities = {
    ...uv, totalFmt: fmt(uv.total), dueLabel: dayMonth(dueDate), monthName: MONTHS_NOM[today.getMonth()],
    deltaText: uv.deltaPct === null ? '' : `${uv.deltaPct > 0 ? '+' : uv.deltaPct < 0 ? '−' : ''}${Math.abs(uv.deltaPct)}% к прошлому месяцу`,
    bars: uv.history.map((h, i) => ({ ...h, h: Math.max(8, Math.round((i === 5 ? (h.value || uv.total) : h.value) / uMax * 100)), current: i === 5 })),
    meters: uv.meters.map((m, i) => ({ ...m, color: [th.at, th.bl, th.rd, th.gr][i % 4], valueFmt: m.value === null ? '—' : String(m.value).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), costFmt: fmt(m.cost) })),
    fixed: uv.fixed.map(f => ({ ...f, amountFmt: fmt(f.amount) })),
  };

  // Календарь: месяц сеткой (с понедельника), точки событий и дней платежей, ближайшие события
  const events = arr(settings.events).filter(e => e && e.id && e.date && e.title);
  const calMonth = /^\d{4}-\d{2}-01$/.test(s.calMonth || '') ? parseIso(s.calMonth) : new Date(today.getFullYear(), today.getMonth(), 1);
  const calNext = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
  const calDay = /^\d{4}-\d{2}-\d{2}$/.test(s.calDay || '') ? s.calDay : todayIso;
  const EV_COLORS = { doctor: th.bl, holiday: th.lv, kids: th.ac, other: th.mu, bill: th.rd };
  const billDays = new Set(bills.flatMap(b => billDates(b.day, iso(calMonth), iso(calNext))));
  const lead = (calMonth.getDay() + 6) % 7;
  const daysInM = daysBetween(calMonth, calNext);
  const calCells = [...Array(lead).fill(null), ...Array.from({ length: daysInM }, (_, k) => {
    const dIso = iso(addDays(calMonth, k));
    const dots = [...new Set(events.filter(e => e.date === dIso).map(e => e.type || 'other'))].map(t => EV_COLORS[t] || th.mu);
    if (billDays.has(dIso)) dots.push(EV_COLORS.bill);
    return { iso: dIso, day: k + 1, isToday: dIso === todayIso, selected: dIso === calDay, dots: dots.slice(0, 3) };
  })];
  const evView = e => ({ ...e, day: parseIso(e.date).getDate(), wd: WEEKDAYS_SHORT[(parseIso(e.date).getDay() + 6) % 7].toLowerCase(), color: EV_COLORS[e.type] || th.mu, costFmt: e.cost ? fmt(e.cost) : '', meta: [e.time, e.who ? (e.who === 'together' ? 'вместе' : 'ведёт ' + nameOf(e.who)) : '', e.note].filter(Boolean).join(' · ') });
  const calendar = {
    monthIso: iso(calMonth),
    monthTitle: MONTHS_NOM[calMonth.getMonth()].replace(/^./, x => x.toUpperCase()) + ' ' + calMonth.getFullYear(),
    cells: calCells, selected: calDay, selectedLabel: dayLabel(parseIso(calDay), today),
    dayEvents: events.filter(e => e.date === calDay).sort((a, b) => String(a.time || '').localeCompare(String(b.time || ''))).map(evView),
    upcoming: events.filter(e => e.date >= (iso(calMonth) > todayIso ? iso(calMonth) : todayIso) && e.date < iso(addDays(calNext, 31))).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 8).map(evView),
    legend: [['doctor', 'врачи'], ['holiday', 'праздники'], ['kids', 'садик'], ['bill', 'платежи']].map(([k, label]) => ({ label, color: EV_COLORS[k] })),
  };

  // Итог прошлого месяца: пришло / ушло / отложили, лимиты, лучшее и перерасход, дела, вопросы на семейный разбор
  const ppP = periodBounds(now, startDay, -2);
  const ppTxs = txsAll.filter(t => inRange(t.date, ppP.startIso, ppP.endIso));
  const rvSpent = sum(prevTxs, t => t.amount);
  const rvStats = buildCatStats(prevTxs, rvSpent).filter(c => c.id !== OTHER_ROW.id || c.spent > 0);
  const rvBudget = sum(rvStats, c => c.limit);
  const rvOver = rvStats.filter(c => c.limit && c.spent > c.limit).sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit));
  const rvBest = rvStats.map(c => { const p0 = catSum(ppTxs, c.id); return p0 && c.spent ? { c, d: Math.round((c.spent - p0) / p0 * 100) } : null; }).filter(Boolean).sort((a, b) => a.d - b.d)[0] || null;
  const rvTasks = allTasks.filter(t => inRange(t.date, prevP.startIso, prevP.endIso));
  const rvAgenda = [
    ...rvOver.slice(0, 2).map(c => ({ id: 'lim-' + c.id, text: `Поднять лимит на ${c.name.toLowerCase()} до ${fmt(Math.ceil(c.spent / 5000) * 5000)}?` })),
    ...(credits.tip ? [{ id: 'early-' + credits.tip.id, text: `Внести ${credits.tip.amountFmt} в ${(creditList.find(c => c.id === credits.tip.id) || {}).name || 'кредит'} досрочно?` }] : []),
    ...events.filter(e => e.date >= todayIso && e.date <= iso(addDays(today, 21)) && (e.cost || e.type === 'holiday')).slice(0, 2).map(e => ({ id: 'ev-' + e.id, text: `${e.title} — ${dayMonth(parseIso(e.date))}${e.cost ? ', заложить ' + fmt(e.cost) : ''}` })),
  ];
  const rvDone = new Set(arr(obj(settings.review)[prevP.startIso]));
  const review = {
    periodIso: prevP.startIso, title: `Итог ${MONTHS_GEN[prevP.start.getMonth()]}`, range: `${dayMonth(prevP.start)} – ${dayMonth(addDays(prevP.end, -1))}`,
    incomeFmt: fmt(periodIncome(prevP)), spentFmt: fmt(rvSpent), savedFmt: fmt(topupsIn(prevP.startIso, prevP.endIso)), hasData: hasData(prevP),
    budgetText: rvBudget ? (rvBudget >= rvSpent ? `Сэкономили ${fmt(rvBudget - rvSpent)} от бюджета.` : `Вышли за бюджет на ${fmt(rvSpent - rvBudget)}.`) : '',
    overText: rvOver.length ? `Лимит не удержали ${rvOver.length === 1 ? 'только ' : ''}в ${rvOver.map(c => '«' + c.name + '»').join(', ')}.` : rvBudget ? 'Все лимиты удержали.' : '',
    best: rvBest && rvBest.d < 0 ? { name: rvBest.c.name, text: `−${Math.abs(rvBest.d)}% к ${MONTHS_DAT[ppP.start.getMonth()]}` } : null,
    worst: rvOver[0] ? { name: rvOver[0].name, text: '+' + fmt(rvOver[0].spent - rvOver[0].limit) } : null,
    tasksDone: rvTasks.filter(t => t.done).length, tasksTotal: rvTasks.length,
    tasksBy: members.map(m => `${m.display_name || '?'} ${rvTasks.filter(t => t.done && t.owner === m.user_id).length}`).join(' · '),
    agenda: rvAgenda.map(x => ({ ...x, done: rvDone.has(x.id) })),
  };

  // Кто кому должен: из чего сложился расчёт — общие траты с долями и личные долги
  const debtsDetail = st ? [
    ...arr(settleLog).filter(x => x.kind === 'loan').map(x => ({ id: 'loan-' + x.date + x.amount, title: x.title || 'Личный долг', meta: `личный долг · ${dayMonth(parseIso(x.date))}`, who: nameOf(x.to), whoColor: memberColor(x.to), amountFmt: fmt(x.amount), share: '100%', date: x.date })),
    ...data.txs.filter(t => t.date >= settleSince && membersById[t.created_by] !== undefined).map(t => {
      const payerIsA = t.created_by === st.A.user_id;
      const other = payerIsA ? st.B : st.A;
      const share = payerIsA ? 1 - st.shareA : st.shareA;
      return { id: t.id, title: t.title, meta: `оплата: ${nameOf(t.created_by)} · ${fmt(t.amount)}`, who: nameOf(other.user_id), whoColor: memberColor(other.user_id), amountFmt: fmt(Math.round(t.amount * share)), share: Math.round(share * 100) + '%', date: t.date };
    }),
  ].sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 30) : [];

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
    spendCats, spendDays, spendCatName: spendCat ? catOf(spendCat).name : '', spendWho, spendQuery: s.spendQuery || '',
    shopping, menu, credits, utilities, calendar, review, debtsDetail,
    pl, choreDefs: chores, choreLog, choreReminders,
    periodShare: daysElapsed / periodDays, analytics, goalCards, goalsMonthFmt: fmt(topupsIn(P.startIso, P.endIso)), billWeek, billsUntilLabel: dayMonth(addDays(P.end, -1)), memberAvatars,
    incomeExpected, incomeMembers, salaries, legacySalary, prevMonthName: MONTHS_NOM[prevP.start.getMonth()],
    incomeSay: (() => {
      const prep = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'][prevP.start.getMonth()];
      if (incomeDelta === null) return '';
      return incomeDelta > 0 ? `На ${incomeDelta}% больше, чем в ${prep}` : incomeDelta < 0 ? `На ${-incomeDelta}% меньше, чем в ${prep}` : `Столько же, сколько в ${prep}`;
    })(),
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
