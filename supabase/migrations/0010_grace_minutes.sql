-- ControlTime — 2026-07-14: tiempo de espera (tolerancia en minutos) sobre
-- la hora de entrada de la jornada (shift_start, ver 0009_shift_hours_and_weekly.sql).
-- Una marcación de entrada temprana, o hasta este margen tardía respecto a
-- shift_start, se registra como shift_start en punto en el cálculo de horas
-- trabajadas (ver lib/reports.ts, applyShiftGracePeriod) — no afecta la
-- marca cruda en attendance_records, solo el cálculo derivado.

alter table public.legal_parameters
  add column grace_minutes integer not null default 0;
