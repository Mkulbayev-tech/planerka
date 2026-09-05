import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CAT_BY_ID, DEFAULT_SETTINGS, GOAL_PALETTE, fmt, uid } from './data.js';
import { iso } from './lib/dates.js';
import { derive } from './model.js';
import { backend } from './backend/index.js';
import { useNow } from './hooks.js';

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
    authStep: 'email', pendingEmail: '', busy: false,
    ...(initial || {}),
  }));
  const stateRef = useRef(s);
  stateRef.current = s;
  const toastTimer = useRef(null);

  const update = useCallback(patch => setS(st => ({ ...st, ...(typeof patch === 'function' ? patch(st) : patch) })), []);
  const showToast = useCallback(msg => {
    clearTimeout(toastTimer.current);
    update({ toast: msg });
    toastTimer.current = setTimeout(() => update({ toast: null }), 1800);
  }, [update]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Семья и её данные
  const loadHousehold = useCallback(async () => {
    update({ loadError: false });
    try {
      const res = await backend.getHousehold();
      if (!res) { update({ household: null, members: [], me: null, data: null }); return; }
      const data = await backend.loadData(res.household.id);
      update({ household: res.household, members: res.members, me: res.me || null, data });
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
    return () => { alive = false; off(); };
  }, [skipBoot, update, loadHousehold]);

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

  const patchSettings = useCallback(async patch => {
    const cur = stateRef.current;
    if (!cur.household) return;
    update(st => ({ household: { ...st.household, settings: { ...DEFAULT_SETTINGS, ...(st.household.settings || {}), ...patch } } }));
    try { await backend.updateSettings(cur.household.id, patch); } catch (e) { console.error(e); showToast('Не удалось сохранить настройки'); loadHousehold(); }
  }, [update, showToast, loadHousehold]);

  const a = useMemo(() => {
    const hid = () => (stateRef.current.household ? stateRef.current.household.id : null);
    const data = () => stateRef.current.data || EMPTY;
    const busy = async fn => { update({ busy: true }); try { await fn(); } finally { update({ busy: false }); } };
    return {
      go: screen => update({ screen, sheet: null }),
      setPeriod: period => update({ period }),
      toggleDark: () => update(st => { const dark = !st.dark; savePrefs({ dark, notif: st.notif }); return { dark }; }),
      toggleNotif: () => update(st => { const notif = !st.notif; savePrefs({ dark: st.dark, notif }); return { notif }; }),
      openSheet: (kind, payload) => update({ sheet: { kind, ...(payload || {}) } }),
      closeSheet: () => update({ sheet: null }),

      // Задачи
      toggleTask: id => {
        const t = data().tasks.find(x => x.id === id);
        if (!t) return;
        const done = !t.done;
        mutate(d => ({ ...d, tasks: d.tasks.map(x => (x.id === id ? { ...x, done } : x)) }), () => backend.update('tasks', id, { done }));
        if (done) showToast('Готово: ' + t.name);
      },
      saveTask: (fields, id) => {
        if (id) {
          mutate(d => ({ ...d, tasks: d.tasks.map(x => (x.id === id ? { ...x, ...fields } : x)) }), () => backend.update('tasks', id, fields));
        } else {
          const row = { id: uid(), ...fields, done: false, date: todayIso() };
          mutate(d => ({ ...d, tasks: [...d.tasks, row] }), () => backend.insert('tasks', row, hid()));
          showToast('Задача добавлена');
        }
      },
      deleteTask: id => mutate(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== id) }), () => backend.remove('tasks', id)),

      // Цели
      topUpGoal: id => {
        const g = data().goals.find(x => x.id === id);
        if (!g) return;
        const add = Math.max(0, Math.min(10000, g.target - g.saved));
        if (!add) { showToast('Цель уже достигнута'); return; }
        mutate(
          d => ({ ...d, goals: d.goals.map(x => (x.id === id ? { ...x, saved: x.saved + add, topups: [...(x.topups || []), { date: todayIso(), amount: add }] } : x)) }),
          () => backend.topUpGoal(id, 10000),
        );
        showToast('Пополнено: ' + g.name);
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
      pickCat: cat => update({ cat }),
      setMethod: method => update({ method }),
      setNote: note => update({ note }),
      submitTx: () => {
        const st = stateRef.current;
        const amount = Number(st.amount || 0);
        if (!amount) return;
        const cat = CAT_BY_ID[st.cat] ? st.cat : 'food';
        const row = { id: uid(), title: st.note.trim() || CAT_BY_ID[cat].name, cat, amount, method: st.method, date: todayIso(), created_by: st.user ? st.user.id : null };
        mutate(d => ({ ...d, txs: [...d.txs, row] }), () => backend.insert('transactions', row, hid()));
        update({ amount: '', note: '', screen: 'home' });
        showToast('Добавлено −' + fmt(amount));
      },
      deleteTx: id => { mutate(d => ({ ...d, txs: d.txs.filter(x => x.id !== id) }), () => backend.remove('transactions', id)); showToast('Трата удалена'); },

      // Настройки семьи
      setSalary: v => patchSettings({ salary: Math.max(0, Math.round(v) || 0) }),
      setMonthStart: day => patchSettings({ monthStartDay: Math.min(28, Math.max(1, Math.round(day) || 1)) }),
      setLimit: (catId, v) => {
        const hh = stateRef.current.household;
        const cur = (hh && hh.settings && hh.settings.limits) || {};
        patchSettings({ limits: { ...cur, [catId]: Math.max(0, Math.round(v) || 0) } });
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
          ...txs.map(t => [t.date, t.title, (CAT_BY_ID[t.cat] || {}).name || t.cat, t.method === 'cash' ? 'Наличные' : 'Карта', t.amount, who(t.created_by)]),
        ];
        const csv = '\uFEFF' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
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
      sendCode: email => busy(async () => {
        const e = String(email || '').trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(e)) { showToast('Введите почту'); return; }
        try { await backend.signInWithEmail(e); update({ pendingEmail: e, authStep: 'code' }); showToast('Письмо отправлено'); }
        catch (err) { showToast('Не удалось отправить: ' + errText(err)); }
      }),
      verifyCode: code => busy(async () => {
        const c = String(code || '').replace(/\s/g, '');
        if (c.length < 6) { showToast('Введите код из письма'); return; }
        try { await backend.verifyCode(stateRef.current.pendingEmail, c); } catch { showToast('Неверный или устаревший код'); }
      }),
      backToEmail: () => update({ authStep: 'email' }),
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
      retryLoad: () => loadHousehold(),
      signOut: async () => {
        try { await backend.signOut(); } catch { /* ignore */ }
        update({ auth: 'out', user: null, household: undefined, members: [], me: null, data: null, screen: 'home', authStep: 'email', sheet: null });
      },
    };
  }, [update, showToast, mutate, patchSettings, loadHousehold]);

  const d = useMemo(() => derive(s, now), [s, now]);
  const value = useMemo(() => ({ s, d, a, mode: backend.mode }), [s, d, a]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used inside <BudgetProvider>');
  return v;
}
