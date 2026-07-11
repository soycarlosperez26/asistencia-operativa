-- Registro Operativo — esquema inicial (v002)
-- Modelo: QR estático por trabajador, un supervisor por proyecto escanea,
-- GPS informativo (sin geofencing), eventos crudos de entrada/salida.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Proyectos / obras (hasta ~15 activos)
-- ---------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Perfiles (extienden auth.users): admins y supervisores.
-- Un supervisor está asignado a un único proyecto.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'supervisor')) default 'supervisor',
  project_id uuid references public.projects (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Trabajadores: QR único y estático, generado al crear el trabajador.
-- ---------------------------------------------------------------------
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  document_id text not null unique,
  qr_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Registros de asistencia: eventos crudos (sin cálculo de horas / nómina).
-- ---------------------------------------------------------------------
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  project_id uuid not null references public.projects (id),
  supervisor_id uuid not null references public.profiles (id),
  type text not null check (type in ('entrada', 'salida')),
  recorded_at timestamptz not null default now(),
  gps_lat double precision,
  gps_lng double precision,
  gps_accuracy double precision
);

create index attendance_records_worker_idx on public.attendance_records (worker_id, recorded_at desc);
create index attendance_records_project_idx on public.attendance_records (project_id, recorded_at desc);

-- ---------------------------------------------------------------------
-- Helpers de RLS (security definer para evitar recursión en policies)
-- ---------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create function public.my_project_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select project_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.profiles enable row level security;
alter table public.workers enable row level security;
alter table public.attendance_records enable row level security;

-- projects: cualquier usuario autenticado puede leer; solo admin escribe.
create policy "projects_select_authenticated" on public.projects
  for select to authenticated using (true);

create policy "projects_write_admin" on public.projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles: cada usuario ve su propio perfil; admin ve y gestiona todos.
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "profiles_write_admin" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- workers: cualquier usuario autenticado puede leer (necesario para escanear
-- el QR); solo admin crea/edita el carnet.
create policy "workers_select_authenticated" on public.workers
  for select to authenticated using (true);

create policy "workers_write_admin" on public.workers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- attendance_records: un supervisor solo ve y registra eventos de su propio
-- proyecto; admin ve y registra en cualquier proyecto.
create policy "attendance_select_own_project_or_admin" on public.attendance_records
  for select to authenticated using (
    project_id = public.my_project_id() or public.is_admin()
  );

create policy "attendance_insert_own_project_or_admin" on public.attendance_records
  for insert to authenticated with check (
    supervisor_id = auth.uid()
    and (project_id = public.my_project_id() or public.is_admin())
  );

-- ---------------------------------------------------------------------
-- Realtime: publicar attendance_records para "Actividad Reciente" en vivo.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.attendance_records;
