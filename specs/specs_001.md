# AlfreTime — Spec del proyecto (v001)

**Estado:** v001 — incorpora audio del cliente (2026-07-11) + capturas de referencia (app GGROUP)
**Basado en:** `spec.md` (v0.1)
**Última actualización:** 2026-07-11

> Este documento no reemplaza `spec.md`, lo actualiza. Donde hay contradicción con v0.1, se marca abajo como punto a confirmar con el cliente.

## 1. Lo que pidió el cliente (transcripción del audio)

> "Quiero hacer un aplicativo para registrar asistencia, tanto asistencia de ingreso como asistencia de salida de trabajadores. Este aplicativo lo voy a utilizar para una empresa, el cual debe llevar un login para ingreso de personal. Luego, cuando esté [adentro], el aplicativo debe llevar registro de asistencia, un botón con la opción de registro de asistencia y el registro se tiene que hacer por medio de QR. Ese QR se va a generar por medio del mismo aplicativo y este se genera un código al cual se va a utilizar para el registro de asistencia."

Puntos clave:
- Login de acceso al aplicativo.
- Pantalla/sección de "Registro de Asistencia" con un botón dedicado.
- El registro se hace escaneando un **código QR**.
- El QR lo genera el propio aplicativo (es decir, cada trabajador tiene un QR emitido por el sistema, no un QR externo).

## 2. Referencia visual — capturas de una app existente (GGROUP, ggroupapp.vercel.app)

El cliente adjuntó 4 capturas de una app ya funcionando que usa como referencia de look & feel y de flujo:

1. **Login** — pantalla "Bienvenido", logo de la empresa, campos Correo Electrónico / Contraseña, botón verde "Iniciar Sesión". Estética limpia, verde oscuro como color de marca.
2. **Pantalla Asistencia** — título "Asistencia" + subtítulo "Gestiona la asistencia de empleados", botón "Registrar Asistencia" arriba a la derecha. Debajo, un bloque "Configuración de registro" con:
   - Selector **Proyecto** (obligatorio) — ej. `P26001-TEBSA PATIO 220KV - TERMOBARRANQUILLA`.
   - Bloque de **Ubicación GPS activa**: coordenadas, precisión (`±31m`), botón "Ver ubicación".
   - Contador **Empleados Presentes**: `37 ingresos de hoy`.
3. **Modal de escaneo QR** — "Escanear código QR": "Apunta la cámara al QR del trabajador para registrar asistencia." Vista de cámara en vivo, opciones "Cambiar cámara" y "Subir foto del QR", botón "Cerrar". Aviso: "Usando ubicación GPS guardada (válida por 9 min más)".
4. **Actividad Reciente (Hoy)** — lista de eventos recién registrados, cada uno con: nombre completo del trabajador, tipo de marcación (`ENTRADA`/`SALIDA`), número de documento, código/nombre del proyecto, quién hizo el registro (ej. "Por: Gustavo Whittaker"), fecha y hora exacta.

## 3. Flujo de registro que muestran las capturas

1. Un usuario (supervisor/admin) inicia sesión.
2. Entra a "Asistencia", selecciona el **proyecto/obra** activo.
3. El sistema captura y muestra la ubicación GPS (con caché de válidez ~9 min para no pedirla en cada escaneo).
4. Presiona "Registrar Asistencia" → se abre la cámara.
5. Escanea el **QR del trabajador** (o sube una foto del QR si no puede escanear en vivo).
6. El sistema guarda el evento: trabajador, tipo (entrada/salida — parece alternar automáticamente según el último estado), documento, proyecto, GPS, quién lo registró, timestamp.
7. El evento aparece de inmediato en "Actividad Reciente".

## 4. ⚠️ Punto a confirmar — esto contradice el modelo elegido en v0.1

`spec.md` (v0.1) proponía deliberadamente el modelo **inverso** al que muestran estas capturas:
- v0.1: un **kiosco fijo** muestra un QR rotativo, y el **trabajador** escanea con su propio celular.
- Audio + capturas: cada **trabajador tiene su propio QR** (fijo, tipo carnet), y es un **supervisor/admin** quien escanea el QR del trabajador con su celular/tablet.

Son arquitecturas distintas (quién tiene el dispositivo, quién genera qué, y qué previene el fraude). Antes de avanzar en diseño técnico hay que confirmar con el cliente cuál de los dos modelos quiere — o si directamente quiere replicar el modelo de GGROUP (QR personal del trabajador + supervisor escanea).

## 5. Otro cambio de alcance a confirmar

v0.1 asumía **1 sede, ~30 operarios**. Las capturas muestran manejo de **múltiples proyectos/obras** (`P26001-TEBSA PATIO 220KV`, `P25006`, etc.) y **múltiples supervisores** registrando asistencia ("Por: Gustavo Whittaker", "Por: Gustavo Perez", "Por: Luis Arevalo"). Esto sugiere una empresa con trabajadores rotando entre distintos proyectos/obras (posible sector construcción/servicios técnicos), no una sola oficina fija. Falta confirmar con el cliente:

- ¿Cuántos proyectos/obras activos maneja normalmente?
- ¿Cuántos supervisores van a tener acceso para registrar asistencia?
- ¿Los trabajadores rotan entre proyectos o quedan fijos a uno?

## 6. Preguntas abiertas (para la próxima conversación con el cliente)

- [ ] Confirmar modelo de QR: ¿QR personal del trabajador (como en GGROUP) o QR rotativo de kiosco (como en v0.1)?
- [ ] ¿Quién escanea? ¿Un supervisor por proyecto, o cualquier admin?
- [ ] ¿Cómo se genera y entrega el QR del trabajador? ¿Se imprime en un carnet físico, o se muestra en el celular del propio trabajador?
- [ ] ¿Cuántos proyectos/obras y cuántos supervisores hay que soportar?
- [ ] ¿Se necesita geofencing (validar que el GPS esté dentro de un radio del proyecto) o el GPS es solo informativo/auditoría, como parece mostrar la captura?
- [ ] ¿El botón "Subir foto del QR" es un caso de respaldo (sin cámara/conexión) o uso normal?
- [ ] Definir reglas de horario, tolerancia de tardanza, horas extra (pendiente desde v0.1).
- [ ] Definir formato del reporte de nómina.

---
*v001 — construido sobre `spec.md` v0.1, a partir del audio del cliente del 2026-07-11 y 4 capturas de referencia de la app GGROUP. Próxima versión: `specs_002.md`, cuando el cliente resuelva los puntos de la sección 6.*
