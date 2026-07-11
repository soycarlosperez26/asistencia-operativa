-- Registro Operativo — agrega observaciones al registrar asistencia.

alter table public.attendance_records
  add column observations text;
