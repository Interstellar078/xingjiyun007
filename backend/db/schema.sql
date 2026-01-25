-- Custom Travel Builder schema

create table if not exists app_data (
  owner_id varchar(120) not null,
  key varchar(255) not null,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id, key)
);

create index if not exists idx_app_data_key on app_data (key);
create index if not exists idx_app_data_public on app_data (is_public);

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

create table if not exists resource_countries (
  id varchar(50) primary key,
  name varchar(100) not null,
  owner_id varchar(120) not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_resource_countries_name on resource_countries (name);
create index if not exists idx_resource_countries_owner on resource_countries (owner_id);
create index if not exists idx_resource_countries_public on resource_countries (is_public);

create table if not exists resource_cities (
  id varchar(50) primary key,
  country varchar(100) not null,
  name varchar(100) not null,
  owner_id varchar(120) not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_resource_cities_country on resource_cities (country);
create index if not exists idx_resource_cities_owner on resource_cities (owner_id);
create index if not exists idx_resource_cities_public on resource_cities (is_public);

create table if not exists resource_spots (
  id varchar(50) primary key,
  city_id varchar(50) not null,
  name varchar(200) not null,
  price integer not null default 0,
  owner_id varchar(120) not null,
  is_public boolean not null default false
);

create index if not exists idx_resource_spots_city on resource_spots (city_id);
create index if not exists idx_resource_spots_owner on resource_spots (owner_id);
create index if not exists idx_resource_spots_public on resource_spots (is_public);

create table if not exists resource_hotels (
  id varchar(50) primary key,
  city_id varchar(50) not null,
  name varchar(200) not null,
  room_type varchar(100),
  price integer not null default 0,
  owner_id varchar(120) not null,
  is_public boolean not null default false
);

create index if not exists idx_resource_hotels_city on resource_hotels (city_id);
create index if not exists idx_resource_hotels_owner on resource_hotels (owner_id);
create index if not exists idx_resource_hotels_public on resource_hotels (is_public);

create table if not exists resource_activities (
  id varchar(50) primary key,
  city_id varchar(50) not null,
  name varchar(200) not null,
  price integer not null default 0,
  owner_id varchar(120) not null,
  is_public boolean not null default false
);

create index if not exists idx_resource_activities_city on resource_activities (city_id);
create index if not exists idx_resource_activities_owner on resource_activities (owner_id);
create index if not exists idx_resource_activities_public on resource_activities (is_public);

create table if not exists resource_transports (
  id varchar(50) primary key,
  region varchar(100) not null,
  car_model varchar(100),
  service_type varchar(50),
  passengers integer not null default 4,
  price_low integer not null default 0,
  price_high integer not null default 0,
  owner_id varchar(120) not null,
  is_public boolean not null default false
);

create index if not exists idx_resource_transports_region on resource_transports (region);
create index if not exists idx_resource_transports_owner on resource_transports (owner_id);
create index if not exists idx_resource_transports_public on resource_transports (is_public);

create table if not exists trips (
  id varchar(50) primary key,
  name varchar(200) not null,
  owner_id varchar(120) not null,
  is_public boolean not null default false,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trips_owner on trips (owner_id);
create index if not exists idx_trips_public on trips (is_public);
