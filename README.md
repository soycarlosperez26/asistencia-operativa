# Registro Operativo - [Company]

Sistema de registro de asistencia (entrada/salida) por proyecto/obra, mediante
QR estático por trabajador. Ver [`specs_002.md`](./specs_002.md) para el
detalle funcional (`spec.md` y `specs_001.md` son versiones anteriores).

**Stack:** Next.js 16 (App Router) + Supabase (Postgres + Auth + Realtime) + Vercel.

## Nombre de la compañía

El nombre "[Company]" es un placeholder. Se define en un único lugar:
[`lib/config.ts`](./lib/config.ts) → `COMPANY_NAME`. Cambiarlo ahí actualiza el
título de la app, el login, el header y los carnets QR.

## 1. Configurar Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta el contenido de
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   Esto crea las tablas (`projects`, `profiles`, `workers`,
   `attendance_records`), las políticas de RLS y habilita Realtime sobre
   `attendance_records`.
3. En **Project Settings → API**, copia `Project URL`, `anon public key` y
   `service_role key`.
4. Copia `.env.example` a `.env.local` y completa esos tres valores:

```bash
cp .env.example .env.local
```

## 2. Crear el primer administrador

El esquema no trae un admin por defecto (evita credenciales fijas en el
código). Pasos:

1. En Supabase → **Authentication → Users**, crea un usuario manualmente
   (correo + contraseña) para ti.
2. En **SQL Editor**, dale rol de admin (sin proyecto asignado, ve todo):

```sql
insert into public.profiles (id, full_name, role)
values ('<uuid-del-usuario-creado>', 'Tu Nombre', 'admin');
```

3. Ese usuario ya puede iniciar sesión en `/login` y desde **Proyectos**
   crear el resto de proyectos y supervisores (los supervisores sí se crean
   desde la app, no requieren pasos manuales).

## 3. Correr en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> La cámara para escanear QR requiere HTTPS o `localhost` — en local funciona
> directo; en producción, Vercel sirve HTTPS automáticamente.

## 3.1 Sembrar datos de prueba (opcional)

Para probar Asistencia y Reportes sin cargar todo a mano, hay un script que
crea ~10 trabajadores mock y ~50 registros de entrada/salida repartidos en
los últimos días hábiles (incluye casos de horas extra y de "Sin
Marcación"). Requiere que ya exista al menos un admin (paso 2):

```bash
npm run seed:mock
```

Solo toca datos identificables como mock (nunca borra trabajadores o
proyectos reales). Para regenerar los registros de asistencia mock desde
cero: `node scripts/seed-mock-data.mjs --reset`.

## 4. Deploy

Conecta el repo a [Vercel](https://vercel.com/new) y configura las mismas
tres variables de entorno del paso 1 en **Project Settings → Environment
Variables**. Cada push a la rama principal se publica solo.

## Modelo (resumen, ver specs_002.md)

- Cada **trabajador** tiene un QR único y estático generado por el sistema
  (`/trabajadores`, botón "Ver carnet QR" → descargar o imprimir).
- Cada **proyecto** tiene un **supervisor** asignado 1:1 (`/proyectos`).
- El supervisor entra a **Asistencia**, la app captura el GPS (informativo,
  cacheado ~9 min), presiona "Registrar Asistencia", escanea el QR del
  trabajador con la cámara, y el sistema alterna automáticamente
  entrada/salida según el último evento de ese trabajador.
- No hay geofencing ni cálculo de horas/nómina en este MVP (ver sección 4 y 5
  de `specs_002.md`) — son eventos crudos, a definir en una fase posterior.

## Estructura

- `app/login` — login de supervisores/admins (Supabase Auth).
- `app/(app)/asistencia` — flujo principal de escaneo y actividad reciente.
- `app/(app)/trabajadores` — alta de trabajadores + generación de carnet QR (admin).
- `app/(app)/proyectos` — alta de proyectos y asignación de supervisores (admin).
- `proxy.ts` — protege rutas y refresca la sesión de Supabase (reemplazo de
  `middleware.ts` en Next.js 16).
- `supabase/migrations/0001_init.sql` — esquema y políticas RLS.
