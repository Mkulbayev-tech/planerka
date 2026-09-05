#!/usr/bin/env node
// Настройка Supabase одной командой: создаёт проект (или берёт существующий), применяет supabase/schema.sql,
// настраивает вход по почте, записывает ключи в .env и в секреты GitHub Actions.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/setup-supabase.mjs --site=https://mkulbayev-tech.github.io/planerka/
//
// Токен: https://supabase.com/dashboard/account/tokens  (Generate new token).
// Параметры: --name=planerka  --region=eu-central-1  --org=<id или имя>  --project-ref=<ref существующего проекта>

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const API = 'https://api.supabase.com/v1';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Нужен SUPABASE_ACCESS_TOKEN. Создайте токен: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const name = args.name || 'planerka';
const region = args.region || 'eu-central-1';
const site = args.site ? String(args.site).replace(/\/?$/, '/') : '';

const log = (...a) => console.log('•', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${typeof json === 'string' ? json : JSON.stringify(json)}`);
  return json;
}

// 1. Проект
let ref = args['project-ref'];
if (!ref) {
  const orgs = await api('GET', '/organizations');
  if (!orgs.length) throw new Error('В аккаунте Supabase нет организаций');
  const org = (args.org && orgs.find(o => o.id === args.org || o.name === args.org)) || orgs[0];
  log('Организация:', org.name);
  const existing = (await api('GET', '/projects')).find(p => p.name === name && p.organization_id === org.id);
  if (existing) {
    ref = existing.id;
    log('Проект уже существует:', ref);
  } else {
    const dbPass = randomBytes(18).toString('base64url') + 'Aa1';
    const p = await api('POST', '/projects', { name, organization_id: org.id, db_pass: dbPass, region });
    ref = p.id;
    writeFileSync('.supabase-db-password', dbPass + '\n');
    log('Проект создан:', ref, '— пароль БД сохранён в .supabase-db-password (файл в .gitignore)');
  }
}

// 2. Ждём, пока база поднимется
for (let i = 0; i < 90; i++) {
  const p = await api('GET', `/projects/${ref}`);
  if (p.status === 'ACTIVE_HEALTHY') break;
  if (i === 0) log('Ждём запуск проекта (1–3 минуты)…');
  await sleep(10000);
}

// 3. Схема
const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
await api('POST', `/projects/${ref}/database/query`, { query: sql });
log('Схема базы применена (supabase/schema.sql)');

// 4. Вход по почте: адрес сайта, разрешённые редиректы, письмо с кодом
const url = `https://${ref}.supabase.co`;
const allow = [site, 'http://localhost:5173/', 'http://localhost:4173/'].filter(Boolean);
try {
  await api('PATCH', `/projects/${ref}/config/auth`, {
    site_url: site || 'http://localhost:5173/',
    uri_allow_list: allow.join(','),
    mailer_subjects_magic_link: 'Код для входа в семейный бюджет',
    mailer_templates_magic_link_content:
      '<h2>Вход в семейный бюджет</h2><p>Ваш код: <b style="font-size:24px;letter-spacing:2px">{{ .Token }}</b></p>' +
      '<p>Или <a href="{{ .ConfirmationURL }}">войдите по ссылке</a>. Код действует один час.</p>',
  });
  log('Вход по почте настроен. Site URL:', site || 'http://localhost:5173/');
} catch (e) {
  log('Не удалось настроить Auth автоматически:', e.message);
  log('Сделайте вручную: Authentication → URL Configuration (Site URL =', site || 'адрес сайта', ') и Email Templates → Magic Link (добавьте {{ .Token }}).');
}

// 5. Ключи
let keys;
try { keys = await api('GET', `/projects/${ref}/api-keys?reveal=true`); } catch { keys = await api('GET', `/projects/${ref}/api-keys`); }
const anonRow = keys.find(k => k.name === 'anon') || keys.find(k => /anon/i.test(k.name || ''));
if (!anonRow || !anonRow.api_key) throw new Error('Не нашёл anon key среди: ' + keys.map(k => k.name).join(', '));
const anon = anonRow.api_key;
writeFileSync('.env', `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${anon}\n`);
log('Ключи записаны в .env');

// 6. Секреты GitHub Actions
try {
  execSync(`gh secret set VITE_SUPABASE_URL --body "${url}"`, { stdio: 'inherit' });
  execSync(`gh secret set VITE_SUPABASE_ANON_KEY --body "${anon}"`, { stdio: 'inherit' });
  log('Секреты GitHub обновлены');
  execSync('gh workflow run deploy.yml', { stdio: 'inherit' });
  log('Запущен деплой на GitHub Pages');
} catch {
  log('gh недоступен — добавьте секреты VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в GitHub → Settings → Secrets и перезапустите деплой');
}

console.log('\nГотово. Проект Supabase:', `https://supabase.com/dashboard/project/${ref}`);
