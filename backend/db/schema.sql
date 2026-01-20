-- Custom Travel Builder schema

create table if not exists app_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id serial primary key,
  username varchar(120) not null unique,
  password_hash varchar(255) not null,
  role varchar(20) not null default 'user',
  created_at timestamptz not null default now()
);

create index if not exists idx_users_created_at on users (created_at desc);

create table if not exists audit_logs (
  id serial primary key,
  timestamp timestamptz not null default now(),
  username varchar(120) not null,
  action varchar(100) not null,
  details text not null
);

create index if not exists idx_audit_logs_timestamp on audit_logs (timestamp desc);
