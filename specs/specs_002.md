# AlfreTime — Spec del proyecto (v002)

**Estado:** v002 — decisiones cerradas sobre el modelo de QR y alcance del MVP
**Basado en:** `specs_001.md`
**Última actualización:** 2026-07-11

> Este documento resuelve las preguntas abiertas de la sección 6 de `specs_001.md`. Donde algo sigue sin definirse, queda marcado como pendiente (no bloquea el MVP).

## 1. Decisiones cerradas

| Pregunta | Decisión |
|---|---|
| Modelo de QR | **QR personal del trabajador** (no kiosco rotativo). Se descarta el modelo de v0.1. |
| Quién escanea | **Un supervisor por proyecto** (no "cualquier admin"). |
| Generación/entrega del QR | El **carnet se genera desde la app**. Puede usarse **físico (impreso)** o **desde el celular del trabajador**. |
| Cantidad de proyectos | Hasta **15 proyectos/obras** activos a soportar. |
| Geofencing | Se necesita a futuro, pero **queda fuera del MVP**. |
| "Subir foto del QR" (respaldo sin cámara) | **No se implementa.** Solo escaneo en vivo con cámara. |
| Reglas de horario / tolerancia / horas extra | **Aún no definidas** por el cliente. Pendiente. |
| Formato del reporte de nómina | **Aún no definido** por el cliente. Pendiente. |

## 2. Modelo de datos (implicado por las decisiones)

- **Trabajador**: perfil con datos básicos + documento de identidad + **QR único y estático** (no rota), generado por el sistema al crear el trabajador. Se puede descargar/imprimir como carnet o mostrar en su celular.
- **Proyecto/obra**: catálogo de hasta 15 proyectos activos (ej. `P26001-TEBSA PATIO 220KV`). Cada proyecto tiene un supervisor asignado.
- **Supervisor**: usuario con login, asignado a **un proyecto** (relación 1 supervisor ↔ 1 proyecto, según lo confirmado). Es quien escanea los QR de los trabajadores de su proyecto.
- **Registro de asistencia**: evento con trabajador, tipo (entrada/salida, alterna automáticamente según el último estado del trabajador), proyecto, supervisor que registró, timestamp, y GPS **informativo** (se captura y se guarda, pero no bloquea el registro — no hay validación de geofence en el MVP).

## 3. Flujo del MVP (actualizado)

1. Supervisor inicia sesión → ve solo su proyecto asignado.
2. Entra a "Asistencia" → GPS se captura automáticamente (informativo, se cachea ~9 min como en la referencia).
3. Presiona "Registrar Asistencia" → se abre la cámara.
4. Escanea el QR (carnet físico o celular) del trabajador. **No hay opción de subir foto** — si no se puede escanear en vivo, no hay registro de respaldo en el MVP.
5. Sistema determina automáticamente si es entrada o salida (según el último evento de ese trabajador) y guarda el registro.
6. Aparece al instante en "Actividad Reciente" y actualiza el contador de "Empleados Presentes" del proyecto.

## 4. Qué queda explícitamente fuera del MVP

- Geofencing / validación de que el GPS esté dentro de un radio del proyecto (se guarda el dato, no se valida).
- Registro de respaldo por foto/carga manual del QR.
- Reglas de horas extra, tardanza, cálculo de nómina — porque las reglas aún no existen. El sistema en el MVP se limita a **registrar eventos crudos de entrada/salida**; el cálculo de horas queda para una fase posterior, una vez el cliente defina las reglas.

## 5. Pendientes (no bloquean el MVP, pero hay que cerrarlos antes de la fase de nómina)

- [ ] Reglas de horario: turnos, tolerancia de tardanza, definición de hora extra.
- [ ] Formato del reporte de nómina (columnas, periodicidad, a quién se le entrega).
- [ ] Confirmar si un supervisor podría eventualmente cubrir más de un proyecto (hoy es 1:1, pero con 15 proyectos vale la pena preguntar si habrá menos de 15 supervisores).
- [ ] Definir qué pasa si un trabajador no tiene su QR a mano (perdió el carnet, celular sin batería) — hoy no hay plan B definido, dado que se descartó "subir foto".

## 6. Impacto en `spec.md` (v0.1) y stack técnico

La arquitectura de v0.1 (kiosco fijo + QR rotativo + geofencing como defensa central) **ya no aplica**. El MVP es más simple:

- No hace falta lógica de tokens firmados con TTL corto (eso era para el QR rotativo del kiosco).
- No hace falta Edge Function de validación de geofence en el MVP (se puede agregar después sin rediseñar el modelo de datos, porque el GPS ya se captura y se guarda desde ahora).
- Sí se necesita: generación de QR estático por trabajador (librería `qrcode`, simple), lectura de QR por cámara del navegador (librería tipo `jsQR` o similar, del lado del cliente, sin backend adicional), y un modelo de roles simple (supervisor ↔ proyecto).
- El stack propuesto en v0.1 (Next.js + Supabase + Vercel, todo capa gratuita) **se mantiene** — el cambio de modelo no lo afecta, solo simplifica el MVP inicial.

---
*v002 — construido sobre `specs_001.md`, con las respuestas del cliente del 2026-07-11. Próxima versión: `specs_003.md`, cuando se definan las reglas de horario y el formato de nómina (sección 5).*
