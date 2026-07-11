# AlfreTime — Spec del proyecto

**Estado:** Borrador v0.1 (iremos actualizando este documento a medida que avancemos)
**Última actualización:** 2026-07-10

## 1. Contexto y problema

La empresa registra hoy la asistencia con un huellero: hay que descargar la data a Excel y tabular manualmente para calcular horas trabajadas por operario. Es lento, propenso a error y no da visibilidad en tiempo real.

Restricciones del proyecto:
- Empresa pequeña, sin departamento de IT → la solución debe mantenerse sola (deploys automáticos, sin servidores que administrar).
- Presupuesto de infraestructura: $0 (capas gratuitas).
- Escala: 1 sede, hasta ~30 operarios.
- Escaneo mixto: dispositivo fijo en la entrada como método principal, celular del operario como respaldo.

## 2. Objetivo

Reemplazar el huellero por un sistema de fichaje con QR que registre entradas/salidas en una base de datos centralizada, calcule automáticamente horas trabajadas, y le dé al jefe un dashboard en tiempo real de asistencia — sin intervención manual en Excel.

## 3. Cómo lo resuelven otras empresas (research)

Los sistemas de fichaje QR/kiosco de mercado (Buddy Punch, Jibble, ClockIt, Gusto Kiosk, allGeo, Open Time Clock) convergen en el mismo patrón:

- **Kiosco compartido**: una tablet o dispositivo fijo en la entrada actúa de punto único de fichaje. No hay hardware especializado que comprar — cualquier tablet/celular viejo sirve.
- **QR único por identidad, no por evento**: cada empleado tiene un QR o PIN propio, para que cada marcación quede ligada a la persona correcta y no se pueda compartir fácilmente.
- **Geofencing**: el sistema valida que el GPS del dispositivo esté dentro de un radio de la oficina antes de aceptar la marcación remota — bloquea fichajes hechos "desde la casa".
- **Verificación adicional**: foto/selfie en el momento del fichaje, para que un supervisor pueda auditar quién marcó.
- **Reducción de costos medible**: eliminar el "buddy punching" (que un compañero marque por otro) y el redondeo manual de horas se traduce en 2-5% menos de costo laboral, según reportan estos proveedores.

Conclusión para AlfreTime: el patrón ganador es **kiosco fijo + QR dinámico + celular del empleado que escanea + geofencing como verificación adicional**, en vez del modelo inverso (empleado muestra su QR y el kiosco lo escanea), porque ese segundo modelo no aporta nada extra sobre el huellero actual y no resuelve el fichaje remoto para el caso de respaldo.

Sources:
- [QR Code Time & Attendance w Geo-fencing — allGeo](https://www.allgeo.com/using-qr-codes-to-track-attendance)
- [How to Prevent Buddy Punching in 2026 — ShiftFlow](https://www.shiftflow.app/blog/prevent-buddy-punching)
- [The #1 QR Code Time Clock — Buddy Punch](https://buddypunch.com/time-clock-software/features/qr-codes/)
- [Kiosk Time Clock Software for Small Business — Gusto](https://gusto.com/product/time-tools/kiosk)
- [The 5 Best Time Clock Kiosk Apps in 2026 — Buddy Punch](https://buddypunch.com/blog/time-clock-kiosk-app/)

## 4. Flujo propuesto

**Fichaje normal (kiosco fijo):**
1. En la entrada hay una tablet/mini PC montada en la pared, conectada al WiFi de la oficina, en modo kiosco (pantalla completa, sin salir de la app).
2. La pantalla muestra un QR que **rota cada 20-30 segundos** (token firmado de un solo uso).
3. El operario abre la cámara de su celular (o una web app sin instalación) y escanea ese QR.
4. El celular manda al servidor: token del kiosco + su identidad (login simple o QR personal) + su GPS.
5. El servidor valida: (a) el token no expiró ni fue usado antes, (b) el GPS del celular está dentro del radio de la oficina (doble verificación, aunque el kiosco físico ya garantiza presencia). Si todo es válido, registra el evento (entrada/salida) con timestamp.
6. Confirmación visual/sonora en el kiosco y en el celular del operario.

**Fichaje de respaldo (sin kiosco, ej. kiosco caído o visita a otra sede):**
- El operario abre la web app en su celular, el sistema pide GPS, valida que esté dentro del geofence de la sede, y opcionalmente toma una foto/selfie para verificación del supervisor.

**Cálculo y visibilidad:**
- Un job diario consolida las marcaciones en horas trabajadas, tardanzas y horas extra por operario.
- El jefe ve en un dashboard web (con login) la asistencia del día en tiempo real y reportes por rango de fechas, exportables a Excel para nómina.

## 5. Mecanismo anti-fraude (evitar marcar sin estar en la oficina)

Ninguna capa sola es suficiente; se combinan:

1. **QR dinámico de un solo uso, con TTL corto (20-30s)**: si alguien le saca foto al QR y se la manda a otra persona, expira antes de que sirva.
2. **Atado al kiosco físico**: el token está firmado con la identidad del kiosco. El QR solo existe si hay un dispositivo físicamente instalado en la oficina generándolo — no se puede fichar sin que ese hardware esté prendido y conectado ahí.
3. **Geofencing como segunda verificación**: el celular que escanea debe reportar GPS dentro de un radio configurable (ej. 100-150m) de la sede. Esto cubre el caso de respaldo (sin kiosco) y añade una capa extra incluso en el flujo normal.
4. **Verificación de identidad**: PIN personal o QR de empleado (carnet) al momento de escanear, para que la marcación quede ligada a la persona, no solo al dispositivo.
5. **Foto opcional (selfie)** en el fichaje de respaldo, para auditoría manual del supervisor si hay dudas.
6. **Rate limiting**: bloquear intentos repetidos de "spoofear" GPS o reusar tokens (alertar al jefe si se detectan intentos fallidos repetidos).

Nota: la falsificación de GPS ("GPS spoofing") en celulares Android/iOS existe y no es 100% bloqueable solo con geofencing — por eso el kiosco fijo es la capa fuerte real, y el geofencing es un complemento, no la única defensa.

## 6. Stack tecnológico propuesto

Criterio: mínimo mantenimiento, sin servidores propios, capa gratuita.

| Capa | Propuesta | Por qué |
|---|---|---|
| Frontend (kiosco + celular + dashboard) | Next.js (PWA) | Un solo código para las 3 pantallas (kiosco, fichaje celular, dashboard del jefe); PWA permite "instalarse" en la tablet del kiosco sin tienda de apps. |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) | Evita mantener un servidor propio. El dashboard en tiempo real usa Supabase Realtime directo. Login del jefe con Supabase Auth. |
| Base de datos | Postgres administrado (incluido en Supabase) | Backups automáticos, sin administración manual. |
| Generación/validación de QR dinámico | Librería `qrcode` + Edge Function que firma tokens (HMAC/JWT corto) | Lógica simple, corre en la capa gratuita de Supabase Functions. |
| Cálculo de horas | Job diario (`pg_cron` en Supabase o Edge Function programada) | Consolida marcaciones en horas trabajadas sin intervención manual. |
| Hosting frontend | Vercel (plan free) | Deploy automático conectado a GitHub — cada cambio se publica solo, cero mantenimiento. |
| Reportes para nómina | Exportación a Excel/PDF | Generado desde el dashboard, listo para el encargado de nómina. |
| Modo offline del kiosco | Service worker con cola local | Si se cae el WiFi, guarda marcaciones localmente y sincroniza al reconectar. |

## 7. Infraestructura

- **Kiosco físico**: una tablet Android económica (~$80-150) o un celular reciclado, montado en la pared cerca de la entrada, conectado al WiFi de la oficina, en modo kiosco con Fully Kiosk Browser (gratis) apuntando a la web del sistema.
- **Backend/DB**: proyecto de Supabase en capa gratuita (Postgres administrado, Auth, Realtime, Storage para fotos, Edge Functions).
  - ⚠️ Limitación a vigilar: los proyectos free de Supabase se pausan tras ~1 semana sin actividad. Como este sistema se usa a diario, no debería pausarse, pero conviene monitorear o configurar un ping periódico.
- **Hosting frontend**: Vercel free tier, con dominio gratuito tipo `alfretime.vercel.app` (evita costo de dominio propio).
- **Repositorio y CI/CD**: GitHub (gratis para repos privados) + deploy automático de Vercel en cada push — así no hace falta IT para publicar cambios.
- **Backups**: los que incluye Supabase por defecto en el plan free.
- **Conectividad**: WiFi existente de la oficina; el modo offline del kiosco cubre caídas puntuales.

## 8. Abierto / próximos pasos

- [ ] Definir reglas exactas de horario (turnos, tolerancia de tardanza, horas extra).
- [ ] Definir el radio del geofence de la sede.
- [ ] Decidir si el "QR de empleado" (carnet) es necesario o si el PIN alcanza.
- [ ] Definir formato del reporte de nómina (columnas, periodicidad).
- [ ] Elegir tablet/dispositivo concreto para el kiosco.

---
*Este documento se irá actualizando a medida que definamos más detalles del proyecto.*
