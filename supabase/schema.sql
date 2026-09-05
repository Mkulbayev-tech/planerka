-- Планировщик расходов: схема общего семейного бюджета для Supabase.
-- Выполните целиком в SQL Editor нового проекта (Supabase → SQL Editor → New query → Run).

create extension if not exists pgcrypto;

-- ---------- таблицы ----------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  settings jsonb not null default '{"salary":0,"monthStartDay":5,"limits":{}}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.transactions (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  cat text not null,
  amount integer not null check (amount > 0),
  method text not null default 'card',
  date date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  time text not null default '',
  tag text not null default 'Дом',
  cat text,
  cost integer not null default 0,
  done boolean not null default false,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  saved integer not null default 0,
  target integer not null check (target > 0),
  per integer not null default 0,
  color text not null,
  bg text not null,
  topups jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.incomes (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  amount integer not null check (amount > 0),
  date date not null,
  method text not null default 'card',
  created_at timestamptz not null default now()
);

create index if not exists transactions_household_date on public.transactions (household_id, date);
create index if not exists tasks_household_date on public.tasks (household_id, date);
create index if not exists goals_household on public.goals (household_id);
create index if not exists incomes_household_date on public.incomes (household_id, date);

-- ---------- доступ: участники семьи видят только свою семью ----------
-- Функция с security definer нужна, чтобы политика на household_members не ссылалась сама на себя.
create or replace function public.my_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.transactions enable row level security;
alter table public.tasks enable row level security;
alter table public.goals enable row level security;
alter table public.incomes enable row level security;

drop policy if exists "members read households" on public.households;
create policy "members read households" on public.households
  for select using (id in (select public.my_household_ids()));
drop policy if exists "members update households" on public.households;
create policy "members update households" on public.households
  for update using (id in (select public.my_household_ids()));

drop policy if exists "members read members" on public.household_members;
create policy "members read members" on public.household_members
  for select using (household_id in (select public.my_household_ids()));
drop policy if exists "member updates own row" on public.household_members;
create policy "member updates own row" on public.household_members
  for update using (user_id = auth.uid());

drop policy if exists "members all transactions" on public.transactions;
create policy "members all transactions" on public.transactions
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));
drop policy if exists "members all tasks" on public.tasks;
create policy "members all tasks" on public.tasks
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));
drop policy if exists "members all goals" on public.goals;
create policy "members all goals" on public.goals
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));
drop policy if exists "members all incomes" on public.incomes;
create policy "members all incomes" on public.incomes
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));

-- ---------- функции: создать семью, присоединиться по коду, пополнить цель ----------
create or replace function public.create_household(p_name text, p_display_name text default '')
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
  code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  insert into public.households (name, invite_code) values (coalesce(nullif(trim(p_name), ''), 'Семейный бюджет'), code) returning * into h;
  insert into public.household_members (household_id, user_id, display_name) values (h.id, auth.uid(), coalesce(p_display_name, ''));
  return h;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text default '')
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into h from public.households where invite_code = upper(trim(p_code));
  if not found then
    raise exception 'Код приглашения не найден';
  end if;
  insert into public.household_members (household_id, user_id, display_name)
  values (h.id, auth.uid(), coalesce(p_display_name, ''))
  on conflict (household_id, user_id) do update set display_name = excluded.display_name;
  return h;
end;
$$;

-- Пополнение цели атомарно: сумма не превышает цель, запись о пополнении добавляется в topups.
create or replace function public.top_up_goal(p_id text, p_amount integer)
returns void
language plpgsql
set search_path = public
as $$
declare
  g public.goals;
  add integer;
begin
  select * into g from public.goals where id = p_id for update;
  if not found then
    raise exception 'goal not found';
  end if;
  add := greatest(0, least(p_amount, g.target - g.saved));
  if add = 0 then
    return;
  end if;
  update public.goals
     set saved = saved + add,
         topups = topups || jsonb_build_array(jsonb_build_object('date', to_char(current_date, 'YYYY-MM-DD'), 'amount', add))
   where id = p_id;
end;
$$;

grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.top_up_goal(text, integer) to authenticated;
grant execute on function public.my_household_ids() to authenticated;

-- ---------- живые обновления ----------
alter table public.transactions replica identity full;
alter table public.tasks replica identity full;
alter table public.goals replica identity full;
alter table public.incomes replica identity full;
alter table public.households replica identity full;
alter table public.household_members replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
do $$
declare t text;
begin
  foreach t in array array['transactions', 'tasks', 'goals', 'incomes', 'households', 'household_members'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
