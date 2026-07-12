-- Registro Operativo — Sección Control: parámetros legales por año.
-- Ver specs/suministros e insumos/specs/logic.spec.md secciones 4, 6 y 8, y las
-- plantillas reales "PLANTILLA DE NOMINA 2026 GENERAL" (hoja HORAS EXTRAS,
-- fila 8): los 4 proyectos de la empresa usan exactamente los mismos 8
-- factores de recargo/horas extra. Acá quedan en una sola tabla por año,
-- editable por el jefe, en vez de repetidos y escritos a mano en cada Excel.

create table public.legal_parameters (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  minimum_wage numeric(12, 2) not null,
  transport_allowance numeric(12, 2) not null,
  -- Todos los *_factor son multiplicadores directos sobre el valor de la
  -- hora ordinaria (salario_mensual / 240), igual que en HORAS EXTRAS de
  -- la plantilla: valor = salario * cantidad_horas * factor / 240.
  -- Valores por defecto = los que usa la empresa hoy en sus 4 plantillas.
  overtime_day_factor numeric(6, 3) not null default 1.25,   -- HED: hora extra diurna
  overtime_night_factor numeric(6, 3) not null default 1.75, -- HEN: hora extra nocturna
  night_surcharge_factor numeric(6, 3) not null default 0.35,-- RN: recargo nocturno (ordinaria)
  holiday_day_factor numeric(6, 3) not null default 1.8,     -- HFD: hora festiva diurna (ordinaria)
  holiday_night_surcharge_factor numeric(6, 3) not null default 1.1, -- RN dominical (manual, no auto-calculado aún)
  holiday_night_factor numeric(6, 3) not null default 2.1,   -- HFN: hora festiva nocturna (ordinaria)
  holiday_overtime_day_factor numeric(6, 3) not null default 2.0,  -- HEFD: hora extra festiva diurna
  holiday_overtime_night_factor numeric(6, 3) not null default 2.5,-- HEFN: hora extra festiva nocturna
  -- Subsidio de almuerzo por día trabajado (hoja RESUMEN DE ALMUERZOS).
  lunch_subsidy_per_day numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_parameters enable row level security;

-- Cualquier usuario autenticado puede leer (el motor de cálculo y los
-- reportes los necesitan); solo admin los edita.
create policy "legal_parameters_select_authenticated" on public.legal_parameters
  for select to authenticated using (true);

create policy "legal_parameters_write_admin" on public.legal_parameters
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
