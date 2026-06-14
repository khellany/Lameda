-- Preview access whitelist — emails manually added by Dayo that get instant access
create table if not exists preview_whitelist (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  note       text,                     -- optional: who referred them
  created_at timestamptz not null default now()
);

-- Waitlist — everyone who signed up but isn't whitelisted yet
create table if not exists waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz             -- set when you email them their access invite
);

-- Lock both tables down — only server-side service role can read/write
alter table preview_whitelist enable row level security;
alter table waitlist enable row level security;

-- No permissive policies = no client access at all
-- Server actions use the admin (service role) client, which bypasses RLS

-- Indexes for the lookup patterns we use
create index if not exists idx_preview_whitelist_email on preview_whitelist (lower(email));
create index if not exists idx_waitlist_email on waitlist (lower(email));
