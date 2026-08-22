-- Cloud sync: make the user_state table safe and usable by authenticated users.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Re-create the policies idempotently so the app can read/write only its own state.
drop policy if exists "Users can read own state" on public.user_state;
drop policy if exists "Users can insert own state" on public.user_state;
drop policy if exists "Users can update own state" on public.user_state;
drop policy if exists "Users can delete own state" on public.user_state;

create policy "Users can read own state"
  on public.user_state for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own state"
  on public.user_state for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own state"
  on public.user_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own state"
  on public.user_state for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_state to authenticated;
