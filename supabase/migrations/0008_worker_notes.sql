-- ControlTime — corrections pass (2026-07-14): notas libres sobre el
-- trabajador (ej. observaciones del admin), editables junto con el resto de
-- su información desde el modal de edición en /trabajadores.

alter table public.workers
  add column notes text;
