-- ControlTime — 2026-07-14: hora de entrada/salida de la jornada y jornada
-- semanal legal de referencia, parametrizables por año en la nueva sección
-- "Parámetros" (antes vivían solo dentro de Nómina). weekly_legal_hours es
-- solo informativo (Ley 2101 de 2021 / Ley 2466 de 2025: la jornada semanal
-- máxima baja a 42h desde el 15 de julio de 2026) — no se usa todavía en el
-- motor de cálculo de horas extra (ver lib/reports.ts, STANDARD_WORKDAY_HOURS,
-- que sigue siendo una jornada diaria fija de 8h).

alter table public.legal_parameters
  add column shift_start time not null default '07:30:00',
  add column shift_end time not null default '16:30:00',
  add column weekly_legal_hours numeric(4, 1) not null default 42;
