-- Throughline personal-state sync
-- One row per user, whole app state stored as a jsonb blob.
-- Conflict resolution: last-write-wins via updated_at.

create table if not exists public.throughline_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Auto-bump updated_at on every update
create or replace function public.throughline_state_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists throughline_state_touch on public.throughline_state;
create trigger throughline_state_touch
  before update on public.throughline_state
  for each row execute function public.throughline_state_touch();

-- Row-Level Security: each user can only see/write their own row
alter table public.throughline_state enable row level security;

drop policy if exists "Users can read their own state" on public.throughline_state;
create policy "Users can read their own state"
  on public.throughline_state for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own state" on public.throughline_state;
create policy "Users can insert their own state"
  on public.throughline_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own state" on public.throughline_state;
create policy "Users can update their own state"
  on public.throughline_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.throughline_state is 'Personal life-OS state per user. One row, whole state as jsonb.';
