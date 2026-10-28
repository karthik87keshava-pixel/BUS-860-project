-- DriveTally database setup. Paste this whole file into Supabase → SQL Editor → Run (once).
-- Saved comparisons: one row per comparison, owned by the signed-in user.

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null default 'My comparison',
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comparisons_user_idx on public.comparisons (user_id, updated_at desc);

-- Row-level security: people can only see and change their own comparisons.
alter table public.comparisons enable row level security;

drop policy if exists "read own" on public.comparisons;
create policy "read own" on public.comparisons for select using (auth.uid() = user_id);
drop policy if exists "insert own" on public.comparisons;
create policy "insert own" on public.comparisons for insert with check (auth.uid() = user_id);
drop policy if exists "update own" on public.comparisons;
create policy "update own" on public.comparisons for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own" on public.comparisons;
create policy "delete own" on public.comparisons for delete using (auth.uid() = user_id);

-- Keep updated_at current on every change.
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists comparisons_touch on public.comparisons;
create trigger comparisons_touch before update on public.comparisons for each row execute function public.touch_updated_at();
