-- ControlTime — corrections pass (2026-07-13): supervisors are no longer
-- tied to a single project. Any authenticated user (admin or supervisor)
-- can read/write attendance for any project; the project picker on
-- /asistencia becomes a UI-level filter, not an access-control boundary.

drop policy if exists "attendance_select_own_project_or_admin" on public.attendance_records;
drop policy if exists "attendance_insert_own_project_or_admin" on public.attendance_records;

create policy "attendance_select_authenticated" on public.attendance_records
  for select to authenticated using (true);

create policy "attendance_insert_authenticated" on public.attendance_records
  for insert to authenticated with check (supervisor_id = auth.uid());

drop function if exists public.my_project_id();

-- No more 1:1 supervisor-project assignment.
alter table public.profiles drop column project_id;

-- Projects are identified by name only now.
alter table public.projects drop column code;

-- New optional worker profile fields (never required).
alter table public.workers
  add column birth_date date,
  add column blood_type text,
  add column email text,
  add column phone text,
  add column job_title text;
