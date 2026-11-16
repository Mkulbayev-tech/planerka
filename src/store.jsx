import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CATS, DEFAULT_SETTINGS, GOAL_PALETTE, allCats, fmt, uid, traty } from './data.js';
import { iso, addDays, parseIso } from './lib/dates.js';
import { derive } from './model.js';
import { guessCat } from './lib/autoplan.js';
import { backend } from './backend/index.js';
import { useNow } from './hooks.js';
import { tap, success, warn, onAppUrlOpen, getLaunchUrl, enableReminder, disableReminder, syncReminder, shareTextFile, updateWidgets, scheduleBillReminders, isNative } from './native.js';
import { ACCENT } from './data.js';

const PREFS_KEY = 'planerka.prefs';
const EMPTY = { txs: [], tasks: [], goals: [], incomes: [] };
const loadPrefs = () => { try { const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); return { dark: !!p.dark, notif: p.notif !== false }; } catch { return { dark: false, notif: true }; } };
const savePrefs = p => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ } };
const errText = e => (e && (e.message || e.error_description || e.msg)) || 'что-то пошло не так';
const todayIso = () => iso(new Date());

const Ctx = createContext(null);

export function BudgetProvider({ children, initial, now: nowProp }) {
  const tick = useNow(60000);
  const now = nowProp || tick;
  const [s, setS] = useState(() => ({
    auth: 'loading', user: null, household: undefined, members: [], me: null, data: null, loadError: false,
    ...loadPrefs(),
    screen: 'home', period: 'month', amount: '', cat: 'food', method: 'card', note: '', toast: null, sheet: null,
    planDate: null, planOwner: 'me', spendCat: null, prev: null, catPicked: false, catAuto: false,
    busy: false,
    ...(initial || {}),
  }));
  const stateRef = useRef(s);
  stateRef.current = s;
  const toastTimer = useRef(null);

  const update = useCallback(patch => setS(st => ({ ...st, ...(typeof patch === 'function' ? patch(st) : patch) })), []);
  const showToast = useCallback((msg, ms = 1800) => {
    clearTimeout(toastTimer.current);
    update({ toast: msg });
    toastTimer.current = setTimeout(() => update({ toast: null }), ms);
  }, [update]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Семья и её данные
  const loadHousehold = useCallback(async () => {
    update({ loadError: false });
    try {
      const res = await backend.getHousehold();
      if (!res) { update({ household: null, members: [], me: null, data: null }); return; }
      const data = await backend.loadData(res.household.id);
      update(st => ({
        household: res.household, members: res.members, me: res.me || null, data,
        user: st.user && res.pinSet !== undefined ? { ...st.user, pinSet: res.pinSet } : st.user,
      }));
    } catch (e) {
      console.error(e);
      update({ loadError: true });
      showToast('Нет связи с сервером');
    }
  }, [update, showToast]);

  // Вход и первичная загрузка
  const skipBoot = !!(initial && initial.auth);
  useEffect(() => {
    if (skipBoot) return undefined;
    let alive = true;
    const apply = async u => {
      if (!alive) return;
      if (!u) { update({ auth: 'out', user: null, household: undefined, members: [], me: null, data: null, screen: 'home', sheet: null }); return; }
      update({ auth: 'in', user: u });
      await loadHousehold();
    };
    backend.getSession().then(apply).catch(e => { console.error(e); if (alive) update({ auth: 'out' }); });
    const off = backend.onAuthChange(u => {
      const cur = stateRef.current;
      const sameUser = (u ? u.id : null) === (cur.user ? cur.user.id : null);
      if (sameUser && cur.auth !== 'loading') return;
      apply(u);
    });
    // Ссылка из письма открыла приложение — завершаем вход
    const handleUrl = async url => {
      try { if (await backend.handleAuthUrl(url)) showToast('Вход выполнен'); }
      catch (e) { console.error(e); showToast('Ссылка устарела, запросите новую'); }
    };
    getLaunchUrl().then(u => { if (u) handleUrl(u); });
    const offUrl = onAppUrlOpen(handleUrl);
    return () => { alive = false; off(); offUrl(); };
  }, [skipBoot, update, loadHousehold, showToast]);

  // Живые обновления от партнёра и обновление при возврате в приложение
  const hid = s.household ? s.household.id : null;
  useEffect(() => {
    if (!hid) return undefined;
    let t = null;
    const refetch = () => { clearTimeout(t); t = setTimeout(loadHousehold, 250); };
    const off = backend.subscribe(hid, refetch);
    const vis = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearTimeout(t); off(); document.removeEventListener('visibilitychange', vis); };
  }, [hid, loadHousehold]);

  // Оптимистичное изменение: сразу в состояние, затем на сервер; при ошибке — перечитать.
  const mutate = useCallback(async (localFn, remoteFn) => {
    update(st => ({ data: localFn(st.data || EMPTY) }));
    try { await remoteFn(); } catch (e) { console.error(e); showToast('Не удалось сохранить: ' + errText(e)); loadHousehold(); }
  }, [update, showToast, loadHousehold]);

  // patch — объект или функция от текущих настроек: функция ещё раз применяется к свежим настройкам на сервере,
  // поэтому одновременные правки лимитов и категорий у двоих не затирают друг друга.
  const patchSettings = useCallback(async patch => {
    const cur = stateRef.current;
    if (!cur.household) return;
    const fn = typeof patch === 'function' ? patch : () => patch;
    update(st => {
      const base = { ...DEFAULT_SETTINGS, ...(st.household.settings || {}) };
      return { household: { ...st.household, settings: { ...base, ...fn(base) } } };
    });
    try { await backend.updateSettings(cur.household.id, fn); } catch (e) { console.error(e); showToast('Не удалось сохранить настройки'); loadHousehold(); }
  }, [update, showToast, loadHousehold]);

  const a = useMemo(() => {
    const hid = () => (stateRef.current.household ? stateRef.current.household.id : null);
    const data = () => stateRef.current.data || EMPTY;
    const cats = () => allCats(stateRef.current.household && stateRef.current.household.settings);
    const busy = async fn => { update({ busy: true }); try { await fn(); } finally { update({ busy: false }); } };
    return {
      // prev — вкладка, с которой открыли «+»: после траты возвращаемся туда же
      go: screen => update(st => ({ screen, sheet: null, prev: screen === 'add' ? st.screen : st.prev, ...(screen === 'add' ? { catPicked: false, catAuto: false } : {}) })),
      // Аппаратная кнопка «назад»: закрыть шторку, вернуться на главную, иначе выйти
      back: () => {
        const st = stateRef.current;
        if (st.sheet) { update({ sheet: null }); return true; }
        if (st.screen !== 'home') { update({ screen: 'home' }); return true; }
        return false;
      },
      setPeriod: period => update({ period }),
      setPlanDate: dateIso => update({ planDate: dateIso }),
      planToday: () => update({ planDate: null }),
      shiftPlanWeek: n => update(st => ({ planDate: iso(addDays(parseIso(st.planDate || todayIso()), 7 * n)) })),
      setPlanOwner: planOwner => update({ planOwner }),
      setSpendCat: spendCat => update({ spendCat }),
      toggleDark: () => update(st => { const dark = !st.dark; savePrefs({ dark, notif: st.notif }); return { dark }; }),
      toggleNotif: async () => {
        const next = !stateRef.current.notif;
        if (next) {
          const ok = await enableReminder();
          if (!ok) { showToast('Разрешите уведомления в Настройках iPhone'); return; }
          if (isNative) showToast('Напомним каждый день в 20:00');
        } else {
          await disableReminder();
        }
        update(st => { savePrefs({ dark: st.dark, notif: next }); return { notif: next }; });
      },
      openSheet: (kind, payload) => update({ sheet: { kind, ...(payload || {}) } }),
      closeSheet: () => update({ sheet: null }),

      // Задачи
      toggleTask: id => {
        const t = data().tasks.find(x => x.id === id);
        if (!t) return;
        const done = !t.done;
        mutate(d => ({ ...d, tasks: d.tasks.map(x => (x.id === id ? { ...x, done } : x)) }), () => backend.update('tasks', id, { done }));
        if (done) { tap(); showToast('Готово: ' + t.name); }
      },
      saveTask: (fields, id) => {
        const { repeat = 'none', ...f } = fields;
        if (id) {
          mutate(d => ({ ...d, tasks: d.tasks.map(x => (x.id === id ? { ...x, ...f } : x)) }), () => backend.update('tasks', id, f));
          return;
        }
        const base = /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') ? f.date : todayIso();
        const dates = repeat === 'daily'
          ? Array.from({ length: 30 }, (_, i) => iso(addDays(parseIso(base), i)))
          : repeat === 'weekly'
            ? Array.from({ length: 8 }, (_, i) => iso(addDays(parseIso(base), 7 * i)))
            : [base];
        const owner = f.owner === undefined ? (stateRef.current.user ? stateRef.current.user.id : null) : f.owner;
        const rows = dates.map(date => ({ id: uid(), ...f, owner, date, done: false }));
        mutate(d => ({ ...d, tasks: [...d.tasks, ...rows] }), () => backend.insertMany('tasks', rows, hid()));
        showToast(rows.length > 1 ? 'Добавлено задач: ' + rows.length : 'Задача добавлена');
      },
      deleteTask: id => mutate(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== id) }), () => backend.remove('tasks', id)),

      // Цели
      topUpGoal: (id, amount = 10000) => {
        const g = data().goals.find(x => x.id === id);
        const want = Math.max(0, Math.round(Number(amount) || 0));
        if (!g || !want) return;
        const add = Math.max(0, Math.min(want, g.target - g.saved));
        if (!add) { showToast('Цель уже достигнута'); return; }
        const by = stateRef.current.user ? stateRef.current.user.id : null;
        mutate(
          d => ({ ...d, goals: d.goals.map(x => (x.id === id ? { ...x, saved: x.saved + add, topups: [...(x.topups || []), { date: todayIso(), amount: add, by }] } : x)) }),
          () => backend.topUpGoal(id, want),
        );
        success();
        showToast('Пополнено: ' + g.name + ' +' + fmt(add));
      },
      saveGoal: (fields, id) => {
        if (id) {
          mutate(d => ({ ...d, goals: d.goals.map(x => (x.id === id ? { ...x, ...fields } : x)) }), () => backend.update('goals', id, fields));
        } else {
          const [color, bg] = GOAL_PALETTE[data().goals.length % GOAL_PALETTE.length];
          const row = { id: uid(), name: fields.name, saved: fields.saved || 0, target: fields.target, per: fields.per || 0, color, bg, topups: [] };
          mutate(d => ({ ...d, goals: [...d.goals, row] }), () => backend.insert('goals', row, hid()));
          showToast('Цель добавлена');
        }
      },
      deleteGoal: id => mutate(d => ({ ...d, goals: d.goals.filter(x => x.id !== id) }), () => backend.remove('goals', id)),

      // Доходы
      saveIncome: (fields, id) => {
        if (id) {
          mutate(d => ({ ...d, incomes: d.incomes.map(x => (x.id === id ? { ...x, ...fields } : x)) }), () => backend.update('incomes', id, fields));
        } else {
          const row = { id: uid(), ...fields };
          mutate(d => ({ ...d, incomes: [...d.incomes, row] }), () => backend.insert('incomes', row, hid()));
          showToast('Доход добавлен: ' + fmt(fields.amount));
        }
      },
      deleteIncome: id => mutate(d => ({ ...d, incomes: d.incomes.filter(x => x.id !== id) }), () => backend.remove('incomes', id)),

      // Траты
      pressKey: label => update(st => {
        if (label === '⌫') return { amount: st.amount.slice(0, -1) };
        if (st.amount.length >= 8) return {};
        if (st.amount === '' && (label === '0' || label === '000')) return {};
        return { amount: st.amount + label };
      }),
      pickCat: cat => update({ cat, catPicked: true, catAuto: false }),
      setMethod: method => update({ method }),
      // Пока категорию не выбрали руками — подбираем её по комментарию («Magnum» → Продукты)
      setNote: note => update(st => {
        if (st.catPicked) return { note };
        const guess = note.trim() ? guessCat(note, (st.data || EMPTY).txs, allCats(st.household && st.household.settings).filter(c => !c.hidden)) : null;
        // catBase — категория до подбора: если комментарий перестал совпадать, возвращаем её
        if (guess) return { note, cat: guess, catAuto: true, catBase: st.catAuto ? st.catBase : st.cat };
        return st.catAuto ? { note, cat: st.catBase || st.cat, catAuto: false } : { note };
      }),
      submitTx: () => {
        const st = stateRef.current;
        const amount = Number(st.amount || 0);
        if (!amount) return;
        const c = cats().find(x => x.id === st.cat && !x.hidden) || CATS[0];
        const cat = c.id;
        const row = { id: uid(), title: st.note.trim() || c.name, cat, amount, method: st.method, date: todayIso(), created_by: st.user ? st.user.id : null };
        mutate(d => ({ ...d, txs: [...d.txs, row] }), () => backend.insert('transactions', row, hid()));
        update(st => ({ amount: '', note: '', catPicked: false, catAuto: false, screen: st.prev || 'home' }));
        success();
        showToast('Добавлено −' + fmt(amount));
      },
      deleteTx: id => { mutate(d => ({ ...d, txs: d.txs.filter(x => x.id !== id) }), () => backend.remove('transactions', id)); showToast('Трата удалена'); },

      // Настройки семьи
      setSalary: v => patchSettings({ salary: Math.max(0, Math.round(v) || 0) }),
      setMonthStart: day => patchSettings({ monthStartDay: Math.min(28, Math.max(1, Math.round(day) || 1)) }),
      setLimit: (catId, v) => patchSettings(cur => ({ limits: { ...(cur.limits || {}), [catId]: Math.max(0, Math.round(v) || 0) } })),
      // Автораспределение: записать лимиты плана и настройки (on — повторять в начале каждого периода)
      applyPlan: (limits, cfg) => {
        patchSettings(cur => ({ limits: { ...(cur.limits || {}), ...limits }, autoPlan: { ...(cur.autoPlan || {}), ...cfg } }));
        success();
        showToast(cfg && cfg.on ? 'Лимиты распределены · дальше автоматически' : 'Лимиты распределены');
      },
      setAutoPlan: cfg => patchSettings(cur => ({ autoPlan: { ...(cur.autoPlan || {}), ...cfg } })),

      // Регулярные платежи (settings.recurring): since — со дня добавления, прошлые даты не вносятся
      saveBill: (fields, id) => {
        const row = {
          title: fields.title, amount: Math.max(0, Math.round(Number(fields.amount) || 0)), day: Math.min(31, Math.max(1, Math.round(Number(fields.day) || 1))),
          cat: fields.cat || null, method: fields.method || 'card', payer: fields.payer || null,
        };
        patchSettings(cur => {
          const list = Array.isArray(cur.recurring) ? cur.recurring : [];
          if (id) return { recurring: list.map(b => (b.id === id ? { ...b, ...row } : b)) };
          return { recurring: [...list, { id: 'b' + uid().replace(/-/g, '').slice(0, 10), since: todayIso(), done: [], ...row }] };
        });
        showToast(id ? 'Платёж сохранён' : 'Платёж добавлен: ' + row.title);
      },
      deleteBill: id => {
        patchSettings(cur => ({ recurring: (Array.isArray(cur.recurring) ? cur.recurring : []).filter(b => b.id !== id) }));
        showToast('Платёж удалён — прошлые траты остались');
      },
      // Внести наступившие платежи: id траты детерминированный, второй телефон дубль не создаст
      runBills: async rows => {
        if (!rows.length) return;
        const clean = rows.map(({ billId, ...r }) => r); // eslint-disable-line no-unused-vars
        update(st => {
          const d = st.data || EMPTY;
          const have = new Set(d.txs.map(t => t.id));
          return { data: { ...d, txs: [...d.txs, ...clean.filter(r => !have.has(r.id))] } };
        });
        try {
          const written = await backend.insertMany('transactions', clean, hid(), { skipExisting: true });
          if (written < clean.length) loadHousehold(); // часть уже внёс второй телефон
        } catch (e) { console.error(e); showToast('Не удалось внести платежи: ' + errText(e)); loadHousehold(); return; }
        const done = {};
        rows.forEach(r => { (done[r.billId] = done[r.billId] || []).push(r.date); });
        patchSettings(cur => ({
          recurring: (Array.isArray(cur.recurring) ? cur.recurring : []).map(b => (done[b.id]
            ? { ...b, done: [...new Set([...(b.done || []), ...done[b.id]])].sort().slice(-24) }
            : b)),
        }));
        const total = rows.reduce((x, r) => x + r.amount, 0);
        showToast(rows.length === 1 ? `Внесён платёж: ${rows[0].title} −${fmt(total)}` : `Внесено платежей: ${rows.length} на ${fmt(total)}`, 2600);
      },

      // Остаток прошлого периода → в цель. claim — чтобы при двух телефонах это случилось один раз
      setSweep: cfg => patchSettings(cur => ({ sweep: { ...(cur.sweep || {}), ...cfg } })),
      sweepNow: async (goalId, amount, period) => {
        const g = data().goals.find(x => x.id === goalId);
        const add = g ? Math.max(0, Math.min(Math.round(amount), g.target - g.saved)) : 0;
        if (!add) return;
        let mine = false;
        try { mine = await backend.claim(hid(), 'sweep', period); } catch (e) { console.error(e); }
        if (!mine) { loadHousehold(); return; }
        const by = stateRef.current.user ? stateRef.current.user.id : null;
        update(st => {
          const hh = st.household;
          return { household: { ...hh, settings: { ...hh.settings, claims: { ...((hh.settings && hh.settings.claims) || {}), sweep: { value: period } } } } };
        });
        mutate(
          d => ({ ...d, goals: d.goals.map(x => (x.id === goalId ? { ...x, saved: x.saved + add, topups: [...(x.topups || []), { date: todayIso(), amount: add, by }] } : x)) }),
          () => backend.topUpGoal(goalId, add),
        );
        patchSettings(cur => ({ sweep: { ...(cur.sweep || {}), last: { period, amount: add, goalId, date: todayIso() } } }));
        success();
        showToast(`Остаток ${fmt(add)} отложен: ${g.name}`, 2600);
      },

      // Расчёты между двумя участниками: доля трат и запись «перевёл» в settings.settle.log
      setSplit: share => patchSettings({ split: { share } }),
      recordSettle: (from, to, amount) => {
        const v = Math.max(0, Math.round(Number(amount) || 0));
        if (!from || !to || !v) return;
        const by = stateRef.current.user ? stateRef.current.user.id : null;
        patchSettings(cur => {
          const log = (cur.settle && Array.isArray(cur.settle.log)) ? cur.settle.log : [];
          return { settle: { ...(cur.settle || {}), log: [...log, { date: todayIso(), from, to, amount: v, by }].slice(-50) } };
        });
        success();
        showToast('Записано: перевод ' + fmt(v));
      },

      // Импорт выписки: траты и поступления; id из содержимого строки — повторный импорт не задвоит
      importRows: async rows => {
        const me = stateRef.current.user ? stateRef.current.user.id : null;
        const cur = data();
        const have = new Set([...cur.txs.map(t => t.id), ...cur.incomes.map(i => i.id)]);
        rows = rows.filter(r => !have.has(r.id)); // eslint-disable-line no-param-reassign
        const txs = rows.filter(r => r.kind === 'tx').map(r => ({ id: r.id, title: r.title, cat: r.cat || 'other', amount: r.amount, method: 'card', date: r.date, created_by: me }));
        const incomes = rows.filter(r => r.kind === 'income').map(r => ({ id: r.id, title: r.title, amount: r.amount, date: r.date, method: 'card' }));
        update(st => {
          const d = st.data || EMPTY;
          return { data: { ...d, txs: [...d.txs, ...txs], incomes: [...d.incomes, ...incomes] } };
        });
        let written = 0;
        try {
          if (txs.length) written += await backend.insertMany('transactions', txs, hid(), { skipExisting: true });
          if (incomes.length) written += await backend.insertMany('incomes', incomes, hid(), { skipExisting: true });
        } catch (e) { console.error(e); showToast('Не удалось импортировать: ' + errText(e)); loadHousehold(); return false; }
        // Часть строк уже была на сервере (например, партнёр импортировал ту же выписку) — сверяемся с сервером
        if (written < txs.length + incomes.length) { loadHousehold(); showToast(`Добавлено ${written} из ${txs.length + incomes.length} — остальные уже были`, 2600); return true; }
        success();
        const spentSum = txs.reduce((x, r) => x + r.amount, 0);
        showToast(`Импортировано: ${traty(txs.length)} на ${fmt(spentSum)}${incomes.length ? ` и ${incomes.length} поступл.` : ''}`, 2600);
        return true;
      },

      // Свои категории трат (кредит, рассрочка…): общие для семьи, лежат в настройках
      saveCategory: (fields, id) => {
        const catId = id || 'c-' + uid().replace(/^id-/, '').slice(0, 8);
        const row = { id: catId, name: fields.name, color: fields.color, bg: fields.bg };
        const limit = Math.max(0, Math.round(Number(fields.limit) || 0));
        patchSettings(cur => {
          const list = Array.isArray(cur.cats) ? cur.cats : [];
          const next = list.some(c => c.id === catId) ? list.map(c => (c.id === catId ? { ...c, ...row } : c)) : [...list, row];
          return { cats: next, limits: { ...(cur.limits || {}), [catId]: limit } };
        });
        showToast(id ? 'Категория сохранена' : 'Категория добавлена: ' + fields.name);
        return catId;
      },
      // Если по категории уже есть траты или задачи — прячем её из выбора, история остаётся; иначе удаляем совсем
      deleteCategory: id => {
        const d = data();
        const used = d.txs.some(t => t.cat === id) || d.tasks.some(t => t.cat === id);
        patchSettings(cur => {
          const list = Array.isArray(cur.cats) ? cur.cats : [];
          if (used) return { cats: list.map(c => (c.id === id ? { ...c, hidden: true } : c)) };
          const limits = { ...(cur.limits || {}) };
          delete limits[id];
          return { cats: list.filter(c => c.id !== id), limits };
        });
        if (stateRef.current.cat === id) update({ cat: CATS[0].id });
        showToast('Категория удалена');
      },
      copyInvite: async () => {
        const hh = stateRef.current.household;
        const code = hh && hh.invite_code;
        if (!code) return;
        try { await navigator.clipboard.writeText(code); showToast('Код скопирован: ' + code); } catch { showToast('Код приглашения: ' + code); }
      },
      exportCsv: () => {
        const txs = [...data().txs].sort((x, y) => (x.date < y.date ? -1 : 1));
        const members = stateRef.current.members || [];
        const who = id => { const m = members.find(x => x.user_id === id); return (m && m.display_name) || ''; };
        const rows = [
          ['Дата', 'Название', 'Категория', 'Способ', 'Сумма', 'Кто'],
          ...txs.map(t => [t.date, t.title, (cats().find(c => c.id === t.cat) || {}).name || 'Другое', t.method === 'cash' ? 'Наличные' : 'Карта', t.amount, who(t.created_by)]),
        ];
        const csv = '\uFEFF' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
        if (isNative) {
          shareTextFile('planerka-traty.csv', csv).then(() => showToast('Экспортировано: ' + txs.length + ' операций')).catch(e => { if (!/cancel/i.test(String(e && e.message))) showToast('Не удалось экспортировать'); });
          return;
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'planerka-traty.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Экспортировано: ' + txs.length + ' операций');
      },
      resetData: async () => {
        if (backend.mode === 'local') {
          if (!window.confirm('Сбросить данные и вернуть демо-сценарий?')) return;
          await backend.resetDemo();
          await loadHousehold();
          showToast('Демо-данные восстановлены');
          return;
        }
        if (!window.confirm('Удалить все траты, задачи, цели и доходы семьи? Это увидят оба участника.')) return;
        if (!window.confirm('Точно удалить? Отменить будет нельзя.')) return;
        try { await backend.clearData(hid()); await loadHousehold(); showToast('Данные удалены'); } catch (e) { showToast('Не удалось удалить: ' + errText(e)); }
      },

      // Вход и семья
      signIn: (login, pin) => busy(async () => {
        if (!login) { showToast('Выберите, кто вы'); return; }
        if (!String(pin || '').trim()) { showToast('Введите пароль'); return; }
        try { await backend.signIn(login, pin); }
        catch (err) { showToast(/invalid|credentials/i.test(errText(err)) ? 'Неверный пароль' : 'Не удалось войти: ' + errText(err)); }
      }),
      createHousehold: (name, myName) => busy(async () => {
        try { await backend.createHousehold(String(name || '').trim() || 'Семейный бюджет', String(myName || '').trim()); await loadHousehold(); showToast('Бюджет создан'); }
        catch (err) { showToast('Не удалось создать: ' + errText(err)); }
      }),
      joinHousehold: (code, myName) => busy(async () => {
        const c = String(code || '').trim().toUpperCase();
        if (c.length < 4) { showToast('Введите код приглашения'); return; }
        try { await backend.joinHousehold(c, String(myName || '').trim()); await loadHousehold(); showToast('Вы присоединились'); }
        catch { showToast('Код не найден'); }
      }),
      changePin: pin => busy(async () => {
        try {
          await backend.changePin(pin);
          update(st => ({ user: st.user ? { ...st.user, pinSet: true } : st.user, sheet: st.sheet && st.sheet.kind === 'pin' ? null : st.sheet }));
          success();
          showToast('Пароль изменён');
        } catch (err) { showToast('Не удалось сменить пароль: ' + errText(err)); }
      }),
      retryLoad: () => loadHousehold(),
      signOut: async () => {
        try { await backend.signOut(); } catch { /* ignore */ }
        update({ auth: 'out', user: null, household: undefined, members: [], me: null, data: null, screen: 'home', sheet: null });
      },
    };
  }, [update, showToast, mutate, patchSettings, loadHousehold]);

  const d = useMemo(() => derive(s, now), [s, now]);

  // Сводка для виджетов iOS (с задержкой, чтобы не дёргать при каждом нажатии)
  const ready = s.auth === 'in' && !!s.household && !!s.data;
  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(() => updateWidgets({
      updatedAt: Date.now(),
      balance: d.balanceFmt, spentPct: Math.min(100, d.spentPct), spent: d.spentFmt, daysLeft: d.daysLeft, perDay: d.perDayLeftFmt,
      cats: d.widgetCats.map(c => ({ letter: c.letter, name: c.name, spent: c.spentShort, color: c.color, bg: c.bg })),
      taskRatio: d.taskRatio, taskPct: d.taskPct, tasks: d.widgetTasks.map(t => ({ name: t.name, done: !!t.done })),
      goal: d.wGoal ? { letter: d.wGoal.letter, name: d.wGoal.name, pct: d.wGoal.pct, saved: d.wGoal.savedShort, target: d.wGoal.targetShort } : null,
      weekTotal: d.weekTotalFmt, weekDelta: d.weekDeltaText,
      weekBars: d.weekBarsDark.map(b => ({ label: b.label, h: b.h, active: b.color === ACCENT })),
      txs: d.recentTxs.slice(0, 3).map(t => ({ letter: t.letter, title: t.title, amount: t.amountFmt, color: t.color, bg: t.bg })),
    }), 800);
    return () => clearTimeout(t);
  }, [ready, d]);

  // Автораспределение в начале нового периода: один раз на период, кто из семьи первым откроет приложение.
  // Функция ещё раз проверяет свежие настройки на сервере, чтобы второй телефон не распределил повторно.
  const autoDone = useRef(null);
  useEffect(() => {
    if (!ready || !d.autoOn || d.autoPeriod === d.periodStartIso || autoDone.current === d.periodStartIso || !(d.autoPlan.income > 0)) return;
    const period = d.periodStartIso;
    const limits = d.autoPlan.limits;
    autoDone.current = period;
    patchSettings(cur => (cur.autoPlan && cur.autoPlan.period === period
      ? {}
      : { limits: { ...(cur.limits || {}), ...limits }, autoPlan: { ...(cur.autoPlan || {}), period } }));
    showToast('Бюджет на новый период распределён');
  }, [ready, d, patchSettings, showToast]);

  // Регулярные платежи: в свой день сами становятся тратой (один раз на набор дат)
  const billsRunning = useRef('');
  useEffect(() => {
    if (!ready || !d.billsDue.length) return;
    const key = d.billsDue.map(r => r.id).join(',');
    if (billsRunning.current === key) return;
    billsRunning.current = key;
    a.runBills(d.billsDue);
  }, [ready, d.billsDue, a]);

  // Напоминания о платежах в день списания (только если напоминания включены)
  const billKey = JSON.stringify([s.notif, d.billReminders]);
  const billKeyRef = useRef('');
  useEffect(() => {
    if (!ready || billKeyRef.current === billKey) return;
    billKeyRef.current = billKey;
    scheduleBillReminders(s.notif ? d.billReminders : []);
  }, [ready, billKey, s.notif, d.billReminders]);

  // Предупреждение, когда категория дошла до 80% или превысила лимит — своей тратой, тратой партнёра или импортом
  const levelsRef = useRef(null);
  const alertTimer = useRef(null);
  useEffect(() => {
    if (!ready) return;
    const levels = Object.fromEntries(d.limitAlerts.map(x => [x.id, x.level]));
    const prev = levelsRef.current;
    levelsRef.current = { period: d.periodStartIso, levels };
    if (!prev || prev.period !== d.periodStartIso) return;
    const rose = d.limitAlerts.filter(x => (prev.levels[x.id] || 0) < x.level);
    if (!rose.length) return;
    const x = rose[0];
    clearTimeout(alertTimer.current);
    // чуть позже тоста «Добавлено», чтобы оба успели прочитать
    alertTimer.current = setTimeout(() => { warn(); showToast(`${x.name}: ${x.text}`, 3200); }, 1100);
  }, [ready, d.limitAlerts, d.periodStartIso, showToast]);
  useEffect(() => () => clearTimeout(alertTimer.current), []);

  // Остаток прошлого периода — в выбранную цель, в начале нового периода
  const sweepRef = useRef(null);
  useEffect(() => {
    if (!ready || !d.sweep.due || d.sweep.skip || sweepRef.current === d.periodStartIso) return;
    sweepRef.current = d.periodStartIso;
    a.sweepNow(d.sweep.goalId, d.sweep.prevLeft, d.periodStartIso);
  }, [ready, d.sweep, d.periodStartIso, a]);

  // Напоминание: переключатель по умолчанию включён — один раз после входа ставим его в расписание по-настоящему
  const reminderSynced = useRef(false);
  useEffect(() => {
    if (!ready || reminderSynced.current) return;
    reminderSynced.current = true;
    syncReminder(stateRef.current.notif).then(on => {
      if (on === stateRef.current.notif) return;
      update(st => { savePrefs({ dark: st.dark, notif: on }); return { notif: on }; });
    });
  }, [ready, update]);

  const value = useMemo(() => ({ s, d, a, mode: backend.mode }), [s, d, a]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used inside <BudgetProvider>');
  return v;
}
