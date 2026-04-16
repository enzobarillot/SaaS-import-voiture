create table if not exists app_users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  plan_tier text not null default ''free'',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists app_sessions (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz
);

create table if not exists saved_reports (
  id text primary key,
  owner_user_id text not null references app_users(id) on delete cascade,
  share_id text unique,
  title text not null,
  vehicle_label text not null,
  total_cost integer not null,
  market_price integer not null,
  estimated_spread integer not null,
  verdict text not null,
  risk_level text not null,
  provider_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  report_json jsonb not null
);

create index if not exists saved_reports_owner_updated_idx on saved_reports(owner_user_id, updated_at desc);
create index if not exists saved_reports_share_idx on saved_reports(share_id);
create table if not exists captured_leads (
  id text primary key,
  email text not null,
  role text,
  message text,
  source text not null,
  intent text,
  page_path text,
  status text not null default ''new'',
  user_id text references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists product_feedback (
  id text primary key,
  sentiment text not null,
  rating integer,
  message text not null,
  would_pay boolean not null default false,
  screen text not null,
  result_id text,
  report_id text,
  page_path text,
  user_id text references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id text primary key,
  name text not null,
  payload jsonb not null,
  anonymous_id text,
  user_id text references app_users(id) on delete set null,
  path text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists captured_leads_created_idx on captured_leads(created_at desc);
create index if not exists product_feedback_created_idx on product_feedback(created_at desc);
create index if not exists analytics_events_name_created_idx on analytics_events(name, created_at desc);