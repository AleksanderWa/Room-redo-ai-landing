-- 0002_align_waitlist.sql
--
-- Aligns the hand-made `public.waitlist` table (created in the Supabase
-- dashboard with columns id int8, created_at timestamptz, email varchar,
-- ip varchar, user_agent varchar) with what /api/waitlist expects.
-- (0001_create_waitlist.sql is historical: it describes a uuid-keyed table
-- that was never created in production.)
--
-- Idempotent: safe to paste into the Supabase SQL editor and run more than
-- once. It does not touch existing rows except where noted.

-- 1. `source` column. The route stores the attribution source (utm/ref)
--    the visitor arrived with; nullable, so existing rows are unaffected.
alter table public.waitlist add column if not exists source text;

-- 2. Make sure inserts that omit `id` and `created_at` work. The route only
--    sends email, source and user_agent, so both need a default. Each block
--    only acts when the column has neither a default nor an identity, so it
--    never overrides what's already there.
do $$
declare
  seq_name text := 'public.waitlist_id_seq';
  start_at bigint;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'waitlist'
      and column_name = 'id'
      and column_default is null
      and is_identity = 'NO'
  ) then
    -- Start past any existing ids so new rows can't collide with them.
    select coalesce(max(id), 0) + 1 into start_at from public.waitlist;
    execute format('create sequence if not exists %s', seq_name);
    execute format('select setval(%L, %s, false)', seq_name, start_at);
    execute format('alter sequence %s owned by public.waitlist.id', seq_name);
    execute format(
      'alter table public.waitlist alter column id set default nextval(%L)',
      seq_name
    );
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'waitlist'
      and column_name = 'created_at'
      and column_default is null
  ) then
    alter table public.waitlist alter column created_at set default now();
  end if;
end
$$;

-- 3. Case-insensitive uniqueness on email. The route lowercases emails
--    before inserting and maps the resulting unique violation (23505) to
--    "you're already on the list". This fails if the table already holds
--    two emails differing only in case; dedupe those rows first.
create unique index if not exists waitlist_email_lower_key
  on public.waitlist (lower(email));

-- 4. Row level security on, so the anon key can do nothing that a policy
--    doesn't explicitly allow.
alter table public.waitlist enable row level security;

-- 5. The only policy: anon may insert. Deliberately no select/update/delete
--    policy, so the anon key (used by the server-side route) can never read,
--    change or delete signups. Dropped first so re-running is safe.
drop policy if exists "anon insert only" on public.waitlist;
create policy "anon insert only" on public.waitlist
  for insert to anon with check (true);

-- 6. Table privilege for the insert. RLS policies only filter what a role
--    is already granted; without this, inserts fail with 42501.
grant insert on public.waitlist to anon;

-- 7. If step 2 created a sequence, anon needs it to draw ids for its
--    inserts (nextval runs as the inserting role).
do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'waitlist_id_seq' and c.relkind = 'S'
  ) then
    grant usage on sequence public.waitlist_id_seq to anon;
  end if;
end
$$;
