-- Hotel Daily Control - Supabase schema v1
-- Ejecutar en Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  director text,
  reception_hours text default '09:00 - 17:00',
  currency text default '€',
  direct_booking_goal integer default 25,
  booking_risk_limit integer default 55,
  high_occupancy_limit integer default 80,
  low_occupancy_limit integer default 45,
  created_at timestamptz default now()
);

create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references hotels(id) on delete cascade,
  report_date date not null,
  manager text,
  shift text,
  arrivals_expected integer default 0,
  arrivals_done integer default 0,
  departures_expected integer default 0,
  departures_done integer default 0,
  new_bookings integer default 0,
  direct_bookings integer default 0,
  booking_bookings integer default 0,
  expedia_bookings integer default 0,
  cancellations integer default 0,
  no_shows integer default 0,
  revenue numeric default 0,
  pending_payments numeric default 0,
  incidents text,
  notes text,
  recommendation text,
  created_at timestamptz default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references hotels(id) on delete cascade,
  incident_date date not null default current_date,
  room text,
  type text not null,
  priority text default 'Media',
  status text default 'Abierta',
  owner text default 'Recepción',
  description text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists room_status (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references hotels(id) on delete cascade,
  status_date date not null default current_date,
  total integer default 0,
  occupied integer default 0,
  blocked integer default 0,
  clean integer default 0,
  dirty integer default 0,
  pending integer default 0,
  created_at timestamptz default now()
);

create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references hotels(id) on delete cascade,
  task_date date not null default current_date,
  area text not null,
  title text not null,
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists sales_channels (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references hotels(id) on delete cascade,
  name text not null,
  bookings integer default 0,
  revenue numeric default 0,
  commission numeric default 0,
  created_at timestamptz default now()
);

-- Row Level Security básico. Para MVP sin login real, se puede dejar desactivado durante pruebas.
-- En producción hay que activar RLS y crear policies por rol/usuario.

-- Datos demo iniciales
insert into hotels (
  name,
  director,
  reception_hours,
  currency,
  direct_booking_goal,
  booking_risk_limit,
  high_occupancy_limit,
  low_occupancy_limit
)
select
  'Hotel Tossa Demo',
  'Dirección',
  '09:00 - 17:00',
  '€',
  25,
  55,
  80,
  45
where not exists (select 1 from hotels where name = 'Hotel Tossa Demo');
