#!/usr/bin/env node
// Заводит профили семьи (вход по номеру и паролю), добавляет обоих в общий бюджет и закрывает регистрацию посторонних.
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/setup-users.mjs [--project-ref=xxxx] [--pin-01=01] [--pin-02=02]
import { readFileSync } from 'node:fs';
import { PROFILES, HOUSEHOLD_NAME, loginEmail, pinToPassword } from '../src/auth-profiles.js';

const API = 'https://api.supabase.com/v1';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('Нужен SUPABASE_ACCESS_TOKEN'); process.exit(1); }
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
let ref = args['project-ref'];
if (!ref) {
  try { ref = readFileSync('.env', 'utf8').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1]; } catch { console.error('Укажите --project-ref'); process.exit(1); }
}
const log = (...a) => console.log('•', ...a);
async function call(url, method, headers, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!r.ok) throw new Error(`${method} ${url.replace(/https:\/\/[^/]+/, '')} → ${r.status}: ${typeof json === 'string' ? json : JSON.stringify(json)}`);
  return json;
}
const mgmt = (method, path, body) => call(API + path, method, { Authorization: 'Bearer ' + token }, body);

const keys = await mgmt('GET', `/projects/${ref}/api-keys?reveal=true`);
const service = (keys.find(k => k.name === 'service_role') || {}).api_key;
if (!service) throw new Error('Не нашёл service_role key');
const base = `https://${ref}.supabase.co/auth/v1`;
const admin = (method, path, body) => call(base + path, method, { apikey: service, Authorization: 'Bearer ' + service }, body);

const existing = (await admin('GET', '/admin/users?page=1&per_page=1000')).users || [];
const ids = {};
for (const p of PROFILES) {
  const email = loginEmail(p.login);
  const password = pinToPassword(args['pin-' + p.login] || p.login);
  const found = existing.find(u => u.email === email);
  if (found) {
    await admin('PUT', `/admin/users/${found.id}`, { password, email_confirm: true, user_metadata: { name: p.name } });
    ids[p.login] = found.id; log('Профиль обновлён:', p.name, '(№' + p.login + ')');
  } else {
    const u = await admin('POST', '/admin/users', { email, password, email_confirm: true, user_metadata: { name: p.name } });
    ids[p.login] = u.id; log('Профиль создан:', p.name, '(№' + p.login + ')');
  }
}

const values = PROFILES.map(p => `('${ids[p.login]}', '${p.name.replace(/'/g, "''")}')`).join(', ');
await mgmt('POST', `/projects/${ref}/database/query`, { query: `
insert into public.households (name, invite_code)
select '${HOUSEHOLD_NAME.replace(/'/g, "''")}', 'SEMYA1' where not exists (select 1 from public.households);
insert into public.household_members (household_id, user_id, display_name)
select h.id, x.user_id::uuid, x.display_name
from (select id from public.households order by created_at limit 1) h, (values ${values}) as x(user_id, display_name)
on conflict (household_id, user_id) do update set display_name = excluded.display_name;
` });
log('Оба профиля добавлены в бюджет «' + HOUSEHOLD_NAME + '»');

await mgmt('PATCH', `/projects/${ref}/config/auth`, { disable_signup: true });
log('Регистрация посторонних отключена');
console.log('\nГотово: вход по номеру 01/02 и паролю.');
