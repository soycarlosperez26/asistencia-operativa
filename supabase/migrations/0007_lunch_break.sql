-- ControlTime — corrections pass (2026-07-14): horario de almuerzo
-- parametrizable por año, para descontar esa "hora muerta" del total de
-- horas trabajadas en Reportes (ver lib/reports.ts, deadTimeMinutesBetween).
-- Modelado como un horario más en legal_parameters, igual que los demás
-- valores editables por año — si más adelante se necesita descontar otro
-- horario muerto (ej. un segundo descanso), se agrega como columnas nuevas
-- acá y una entrada más en el arreglo de DeadTimeWindow que arma
-- lib/legalParameters.ts, sin tocar la lógica de cálculo.

alter table public.legal_parameters
  add column lunch_break_start time not null default '12:00:00',
  add column lunch_break_end time not null default '13:00:00';
