// Локальный режим (без Supabase): один пользователь, данные в localStorage, демо-сценарий из макета.
// Событие storage позволяет проверить синхронизацию между двумя вкладками браузера.
import { demoSeed } from '../data.js';
import { iso } from '../lib/dates.js';

const KEY = 'planerka.v2';
const TABLES = { transactions: 'txs', tasks: 'tasks', goals: 'goals', incomes: 'incomes' };

const read = () => { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const write = db => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* хранилище недоступно */ } };

function fresh() {
  const seed = demoSeed(new Date());
  return {
    household: { id: 'local', name: 'Наша семья', invite_code: '', settings: seed.settings },
    members: [{ user_id: 'local', display_name: 'Айдана' }],
    txs: seed.txs, tasks: seed.tasks, goals: seed.goals, incomes: seed.incomes,
  };
}
function ensure() {
  let db = read();
  if (!db || !db.household) { db = fresh(); write(db); }
  return db;
}
const change = fn => { const db = ensure(); fn(db); write(db); return db; };

export function createLocalBackend() {
  return {
    mode: 'local',
    async getSession() { return { id: 'local', email: '' }; },
    onAuthChange() { return () => {}; },
    async signInWithEmail() {},
    async verifyCode() {},
    async signOut() {},
    async handleAuthUrl() { return false; },
    async getHousehold() { const db = ensure(); return { household: db.household, members: db.members, me: db.members[0] }; },
    async createHousehold() { return ensure().household; },
    async joinHousehold() { return ensure().household; },
    async updateSettings(_hid, patch) {
      return change(db => { db.household.settings = { ...db.household.settings, ...patch }; }).household.settings;
    },
    async loadData() { const db = ensure(); return { txs: db.txs, tasks: db.tasks, goals: db.goals, incomes: db.incomes }; },
    async insert(table, row) { change(db => { db[TABLES[table]].push({ ...row, created_at: new Date().toISOString() }); }); },
    async update(table, id, patch) { change(db => { db[TABLES[table]] = db[TABLES[table]].map(r => (r.id === id ? { ...r, ...patch } : r)); }); },
    async remove(table, id) { change(db => { db[TABLES[table]] = db[TABLES[table]].filter(r => r.id !== id); }); },
    async topUpGoal(id, amount) {
      change(db => {
        db.goals = db.goals.map(g => {
          if (g.id !== id) return g;
          const add = Math.max(0, Math.min(amount, g.target - g.saved));
          return { ...g, saved: g.saved + add, topups: [...(g.topups || []), { date: iso(new Date()), amount: add }] };
        });
      });
    },
    async clearData() { change(db => { db.txs = []; db.tasks = []; db.goals = []; db.incomes = []; }); },
    async resetDemo() { write(fresh()); },
    subscribe(_hid, cb) {
      const h = e => { if (e.key === KEY) cb(); };
      window.addEventListener('storage', h);
      return () => window.removeEventListener('storage', h);
    },
  };
}
