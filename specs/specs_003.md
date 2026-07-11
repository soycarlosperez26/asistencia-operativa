# Registro Operativo — Spec del proyecto (v003)

**Estado:** v003 — dos cambios funcionales sobre el MVP: GPS oculto (premium) y observaciones en el registro de asistencia.
**Basado en:** `specs_002.md`
**Última actualización:** 2026-07-11

> Este documento registra cambios hechos **después** de construir la base del proyecto (Next.js + Supabase, ver commit inicial). No reemplaza `specs_002.md`, lo actualiza.

## 1. Cambio: GPS oculto (funcionalidad premium)

**Decisión del cliente:** por ahora no se debe pedir ni mostrar el GPS al registrar asistencia. Es una funcionalidad premium que se habilitará más adelante, avisando explícitamente cuándo.

**Qué cambió:**
- El bloque "Ubicación GPS activa" ya no aparece en la pantalla de Asistencia.
- El navegador ya no solicita permiso de geolocalización al entrar a Asistencia.
- Los registros de asistencia se siguen guardando con `gps_lat` / `gps_lng` / `gps_accuracy`, pero ahora quedan en `null` mientras el flag esté apagado (la columna no se eliminó — es reversible sin migración).

**Cómo se implementó (para reactivarlo):**
- Flag único en `lib/config.ts`: `GPS_ENABLED = false`. Cambiarlo a `true` reactiva la captura y el bloque visual sin tocar el resto del código.
- `lib/useGps.ts` recibe `enabled` como parámetro; si es `false`, no lee caché de sesión ni pide el permiso del navegador.

**Pendiente / a confirmar cuando se habilite:** el modelo de "premium" (por proyecto, por plan, por cliente) no está definido — hoy es un único flag global de código, no una configuración por cuenta. Si el plan premium debe activarse distinto por cliente, hay que rediseñar esto como una columna/config en base de datos en vez de un flag de código.

## 2. Cambio: Observaciones al registrar asistencia

**Pedido del cliente:** al marcar la asistencia debe aparecer una ventana para colocar observaciones, y esa observación se debe guardar en la base de datos.

**Flujo actualizado:**
1. Supervisor presiona "Registrar Asistencia" → se abre la cámara.
2. Escanea el QR del trabajador → el sistema resuelve el trabajador (nombre, documento) **sin registrar todavía el evento**.
3. Se abre una ventana "Observaciones" mostrando el nombre del trabajador reconocido y un campo de texto libre (opcional).
4. El supervisor puede escribir una observación o dejarla vacía, y confirma con "Registrar Asistencia" (o cancela sin guardar nada).
5. Recién ahí se guarda el evento en `attendance_records`, con la observación incluida.
6. La observación queda visible en "Actividad Reciente" debajo del registro correspondiente.

**Modelo de datos:** nueva columna `observations text` (nullable) en `attendance_records` — ver `supabase/migrations/0002_attendance_observations.sql`. No requiere cambios de RLS (las políticas existentes de `attendance_records` ya cubren la columna nueva).

**Nota de implementación:** el escaneo de QR ahora se resuelve en dos pasos (`lookupWorkerByQr` primero, `registerAttendance` después) en vez de uno solo, específicamente para poder mostrarle al supervisor a quién le está registrando la asistencia antes de pedirle la observación.

## 3. Impacto en el esquema

Migraciones nuevas desde v002:
- `0002_attendance_observations.sql` — agrega `observations` a `attendance_records`.

Quien despliegue esta versión sobre una base ya creada con `0001_init.sql` debe correr esta migración en el SQL Editor de Supabase antes de usar la nueva ventana de observaciones.

## 4. Pendientes (sin cambios respecto a v002)

Siguen abiertos los mismos pendientes de `specs_002.md` sección 5 (reglas de horario, formato de nómina, qué pasa si el trabajador no tiene el QR a mano). Se suma:

- [ ] Definir el modelo real de "funcionalidad premium" para el GPS (¿por cliente? ¿por plan? ¿toggle manual del admin?) antes de reactivarlo en producción.
- [ ] Definir si la observación debe ser obligatoria en algún caso (por ejemplo, solo en salidas, o solo si el supervisor marca una incidencia) — hoy es siempre opcional.

---
*v003 — construido sobre `specs_002.md`, a partir de dos pedidos del cliente del 2026-07-11 (ocultar GPS, agregar observaciones). Próxima versión: `specs_004.md`.*
