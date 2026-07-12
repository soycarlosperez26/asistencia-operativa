-- Registro Operativo — salario del trabajador, necesario para que Control
-- pueda calcular la nómina (básico, extras, deducciones) por trabajador.
-- Ver 'BASE DE DATOS' de las plantillas de nómina, columna SALARIO.

alter table public.workers
  add column monthly_salary numeric(12, 2);
