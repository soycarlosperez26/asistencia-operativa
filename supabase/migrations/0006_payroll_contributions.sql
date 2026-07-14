-- ControlTime — corrections pass (2026-07-13): additional payroll line
-- items requested by the client, on top of the existing 8 overtime/
-- surcharge factors: social security (health/pension/FSP, employer +
-- employee shares), parafiscal taxes, prestaciones sociales, ARL by risk
-- level (1-5), and incapacidades (%). Employer-only contributions do not
-- affect a worker's net pay — they are informational payroll cost only.

alter table public.legal_parameters
  add column health_employer_percent numeric(6, 4) not null default 0.085,
  add column health_employee_percent numeric(6, 4) not null default 0.04,
  add column pension_employer_percent numeric(6, 4) not null default 0.12,
  add column pension_employee_percent numeric(6, 4) not null default 0.04,
  add column fsp_employee_percent numeric(6, 4) not null default 0,
  add column caja_compensacion_percent numeric(6, 4) not null default 0.04,
  add column icbf_percent numeric(6, 4) not null default 0.03,
  add column sena_percent numeric(6, 4) not null default 0.02,
  add column cesantias_percent numeric(6, 4) not null default 0.0833,
  add column cesantias_interes_percent numeric(6, 4) not null default 0.01,
  add column vacaciones_percent numeric(6, 4) not null default 0.0417,
  add column primas_percent numeric(6, 4) not null default 0.0833,
  add column arl_level_1_percent numeric(6, 4) not null default 0.00522,
  add column arl_level_2_percent numeric(6, 4) not null default 0.01044,
  add column arl_level_3_percent numeric(6, 4) not null default 0.02436,
  add column arl_level_4_percent numeric(6, 4) not null default 0.0435,
  add column arl_level_5_percent numeric(6, 4) not null default 0.0696,
  add column incapacidad_percent numeric(6, 4) not null default 0;

-- Risk level (1-5) used to look up the applicable ARL percent per worker.
alter table public.workers
  add column arl_risk_level smallint not null default 1
    check (arl_risk_level between 1 and 5);
