create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz default now()
);
alter table waitlist enable row level security;
create policy "anon insert only" on waitlist for insert to anon with check (true);

-- Deliberately no select/update/delete policy: the anon key (used by the
-- server-side /api/waitlist route handler) must never be able to read,
-- modify, or delete rows in this table.
