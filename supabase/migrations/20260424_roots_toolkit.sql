-- Roots Relocation Toolkit — tables for Moni & Adriana's shared values questionnaire and Vesta chat.
-- Two allowlisted users: msmascio@gmail.com and adrianavarchetta@gmail.com.

-- ANSWERS: one row per user, JSONB blob of all answers.
create table if not exists public.roots_answers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- CHAT: shared chat log for both sisters + Vesta's responses.
create table if not exists public.roots_chat (
  id bigserial primary key,
  author text not null check (author in ('moni','adriana','vesta')),
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists roots_chat_created_idx on public.roots_chat (created_at);

alter table public.roots_answers enable row level security;
alter table public.roots_chat enable row level security;

-- Only the two allowlisted emails may read or write. We check via the JWT claim.
create or replace function public.roots_is_allowed() returns boolean
language sql stable security definer as $$
  select coalesce(
    (auth.jwt() ->> 'email') in ('msmascio@gmail.com','adrianavarchetta@gmail.com'),
    false
  );
$$;

-- ANSWERS policies
drop policy if exists roots_answers_select on public.roots_answers;
create policy roots_answers_select on public.roots_answers
  for select using (public.roots_is_allowed());

drop policy if exists roots_answers_insert on public.roots_answers;
create policy roots_answers_insert on public.roots_answers
  for insert with check (public.roots_is_allowed() and user_id = auth.uid());

drop policy if exists roots_answers_update on public.roots_answers;
create policy roots_answers_update on public.roots_answers
  for update using (public.roots_is_allowed() and user_id = auth.uid())
  with check (public.roots_is_allowed() and user_id = auth.uid());

-- CHAT policies
drop policy if exists roots_chat_select on public.roots_chat;
create policy roots_chat_select on public.roots_chat
  for select using (public.roots_is_allowed());

drop policy if exists roots_chat_insert on public.roots_chat;
create policy roots_chat_insert on public.roots_chat
  for insert with check (
    public.roots_is_allowed()
    and (
      (author = 'vesta' and user_id is null)
      or (author in ('moni','adriana') and user_id = auth.uid())
    )
  );

grant execute on function public.roots_is_allowed() to authenticated;
