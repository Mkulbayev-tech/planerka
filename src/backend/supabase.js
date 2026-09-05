// Общий семейный бюджет на Supabase: вход по почте, семья по коду приглашения,
// строки в таблицах transactions / tasks / goals / incomes и живые обновления через Realtime.
import { createClient } from '@supabase/supabase-js';
import { isNative, nativeStorage } from '../native.js';

const TABLES = ['transactions', 'tasks', 'goals', 'incomes'];

export function createSupabaseBackend(url, key) {
  const sb = createClient(url, key, { auth: { storage: nativeStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: !isNative } });
  const toUser = session => (session && session.user ? { id: session.user.id, email: session.user.email || '' } : null);
  const rows = async q => { const { data, error } = await q; if (error) throw error; return data; };

  return {
    mode: 'supabase',

    async getSession() { const { data } = await sb.auth.getSession(); return toUser(data.session); },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return; // первичную сессию уже вернул getSession()
        cb(toUser(session));
      });
      return () => data.subscription.unsubscribe();
    },
    async signInWithEmail(email) {
      const options = isNative ? {} : { emailRedirectTo: window.location.origin + window.location.pathname };
      const { error } = await sb.auth.signInWithOtp({ email, options });
      if (error) throw error;
    },
    async verifyCode(email, token) {
      const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;
    },
    async signOut() { await sb.auth.signOut(); },

    async getHousehold() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const mem = await rows(sb.from('household_members').select('household_id, display_name').eq('user_id', user.id).limit(1));
      if (!mem.length) return null;
      const hid = mem[0].household_id;
      const [household] = await rows(sb.from('households').select('*').eq('id', hid).limit(1));
      if (!household) return null;
      const members = await rows(sb.from('household_members').select('user_id, display_name').eq('household_id', hid));
      return { household, members, me: members.find(m => m.user_id === user.id) || null };
    },
    async createHousehold(name, displayName) { return rows(sb.rpc('create_household', { p_name: name, p_display_name: displayName })); },
    async joinHousehold(code, displayName) { return rows(sb.rpc('join_household', { p_code: code, p_display_name: displayName })); },
    async updateSettings(hid, patch) {
      const [hh] = await rows(sb.from('households').select('settings').eq('id', hid).limit(1));
      const settings = { ...((hh && hh.settings) || {}), ...patch };
      await rows(sb.from('households').update({ settings }).eq('id', hid));
      return settings;
    },

    async loadData(hid) {
      const [txs, tasks, goals, incomes] = await Promise.all(
        TABLES.map(t => rows(sb.from(t).select('*').eq('household_id', hid).order('created_at'))),
      );
      return { txs, tasks, goals, incomes };
    },
    async insert(table, row, hid) { await rows(sb.from(table).insert({ ...row, household_id: hid })); },
    async update(table, id, patch) { await rows(sb.from(table).update(patch).eq('id', id)); },
    async remove(table, id) { await rows(sb.from(table).delete().eq('id', id)); },
    async topUpGoal(id, amount) { await rows(sb.rpc('top_up_goal', { p_id: id, p_amount: amount })); },
    async clearData(hid) { for (const t of TABLES) await rows(sb.from(t).delete().eq('household_id', hid)); },

    subscribe(hid, cb) {
      const ch = sb.channel('household-' + hid);
      for (const t of TABLES) ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: 'household_id=eq.' + hid }, cb);
      ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: 'id=eq.' + hid }, cb);
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter: 'household_id=eq.' + hid }, cb);
      ch.subscribe();
      return () => { sb.removeChannel(ch); };
    },
  };
}
