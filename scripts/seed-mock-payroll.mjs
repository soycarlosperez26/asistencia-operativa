// Genera un dataset mock grande para probar Reportes y Nómina: un pool de
// 50 trabajadores (sin atar cada uno a un único proyecto — un trabajador
// puede marcar asistencia en cualquier proyecto, igual que en producción),
// con marcaciones de entrada/salida en todos los días hábiles desde el 1 de
// junio hasta hoy, repartidas entre los proyectos mock existentes.
// Pensado solo para entornos de prueba — nunca correr contra producción real.
//
// Uso: npm run seed:mock-payroll

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (!globalThis.WebSocket) {
  const { default: WebSocket } = await import("ws");
  globalThis.WebSocket = WebSocket;
}

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TOTAL_WORKERS = 50;
const PERIOD_START = new Date(2026, 5, 1); // 1 de junio 2026
// Prefijo de cédula del set mock — permite identificar y limpiar estos
// trabajadores en reruns sin tocar trabajadores reales u otros datos mock.
const MOCK_DOC_PREFIX = "9900";
const MOCK_PROJECTS = [
  { name: "Torre Norte - Mantenimiento" },
  { name: "Torre Sur - Instalaciones" },
];

const SALARY_TIERS = [1750905, 2050905, 2350905];

const FIRST_NAMES = [
  "CARLOS", "MARIA", "JOSE", "LUIS", "ANA", "JUAN", "DIANA", "MIGUEL", "LAURA", "ANDRES",
  "CAMILA", "JORGE", "PAOLA", "SERGIO", "VALERIA", "RICARDO", "DANIELA", "FELIPE", "NATALIA", "OSCAR",
  "SOFIA", "ALEJANDRO", "MONICA", "DAVID", "JULIANA", "FERNANDO", "CATALINA", "EDUARDO", "GABRIELA", "ROBERTO",
  "PATRICIA", "MARTIN", "ADRIANA", "PABLO", "VERONICA", "SANTIAGO", "CAROLINA", "RAFAEL", "ISABEL", "ALVARO",
  "LORENA", "MAURICIO", "SANDRA", "HECTOR", "YULIANA", "GUSTAVO", "MARCELA", "VICTOR", "TATIANA", "ARMANDO",
];

const LAST_NAMES = [
  "RODRIGUEZ", "GOMEZ", "MARTINEZ", "HERNANDEZ", "PEREZ", "GONZALEZ", "SANCHEZ", "RAMIREZ", "TORRES", "FLORES",
  "RIVERA", "DIAZ", "VARGAS", "CASTRO", "ROMERO", "SUAREZ", "MORALES", "ORTIZ", "GUTIERREZ", "CHAVEZ",
  "MENDOZA", "JIMENEZ", "RUIZ", "ACOSTA", "CARDENAS", "PATIÑO", "ARIAS", "SALAZAR", "PEÑA", "CORTES",
];

function buildWorkerNames(count) {
  const names = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const last2 = LAST_NAMES[(Math.floor(i / FIRST_NAMES.length) + 3) % LAST_NAMES.length];
    names.push(`${first} ${last} ${last2}`);
  }
  return names;
}

function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function workdaysBetween(start, end) {
  const days = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    if (isWeekday(cursor)) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function atTime(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function insertInChunks(table, rows, chunkSize = 1000) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw error;
    console.log(`  ${table}: insertadas ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }
}

async function main() {
  const today = new Date();
  console.log(`Período: ${PERIOD_START.toISOString().slice(0, 10)} a ${today.toISOString().slice(0, 10)}`);

  console.log("Consultando proyectos existentes...");
  const { data: existingProjects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name");
  if (projectsError) throw projectsError;

  const projects = [];
  for (const mockProject of MOCK_PROJECTS) {
    const found = (existingProjects ?? []).find((p) => p.name === mockProject.name);
    if (found) {
      projects.push(found);
      continue;
    }
    console.log(`Creando proyecto mock ${mockProject.name}...`);
    const { data: inserted, error } = await supabase
      .from("projects")
      .insert({ name: mockProject.name })
      .select("id, name")
      .single();
    if (error) throw error;
    projects.push(inserted);
  }
  console.log(`Proyectos: ${projects.map((p) => p.name).join(", ")}`);

  console.log("Consultando perfiles (admin/supervisor) existentes...");
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, role");
  if (profilesError) throw profilesError;

  if (!profiles || profiles.length === 0) {
    console.error(
      "No hay ningún perfil (admin/supervisor) en la base todavía.\n" +
        "Creá primero el admin manualmente antes de sembrar datos mock."
    );
    process.exit(1);
  }

  // Cualquier supervisor o admin puede registrar asistencia en cualquier
  // proyecto (los supervisores ya no están atados a uno solo), así que
  // alcanza con un único perfil para firmar todas las marcaciones mock.
  const signer = profiles.find((p) => p.role === "admin") ?? profiles[0];

  console.log("Consultando trabajadores existentes...");
  const { data: existingWorkers, error: workersError } = await supabase
    .from("workers")
    .select("id, full_name, document_id");
  if (workersError) throw workersError;

  const oldMockWorkers = (existingWorkers ?? []).filter((w) =>
    w.document_id.startsWith(MOCK_DOC_PREFIX)
  );
  if (oldMockWorkers.length > 0) {
    console.log(`Borrando ${oldMockWorkers.length} trabajadores mock anteriores y sus marcaciones...`);
    const oldIds = oldMockWorkers.map((w) => w.id);
    const { error: deleteAttendanceError } = await supabase
      .from("attendance_records")
      .delete()
      .in("worker_id", oldIds);
    if (deleteAttendanceError) throw deleteAttendanceError;

    const { error: deleteWorkersError } = await supabase
      .from("workers")
      .delete()
      .in("id", oldIds);
    if (deleteWorkersError) throw deleteWorkersError;
  }

  // Pool único: cada trabajador puede marcar en cualquiera de los proyectos
  // mock, no está atado a uno solo (igual que en producción).
  const workerNames = buildWorkerNames(TOTAL_WORKERS);
  const workersToInsert = workerNames.map((name, i) => ({
    full_name: name,
    document_id: `${MOCK_DOC_PREFIX}${String(i + 1).padStart(6, "0")}`,
    monthly_salary: SALARY_TIERS[i % SALARY_TIERS.length],
  }));

  console.log(`Creando ${workersToInsert.length} trabajadores mock...`);
  const { data: insertedWorkers, error: insertWorkersError } = await supabase
    .from("workers")
    .insert(workersToInsert)
    .select("id, full_name, document_id");
  if (insertWorkersError) throw insertWorkersError;

  const workdays = workdaysBetween(PERIOD_START, today);
  console.log(`Generando marcaciones para ${workdays.length} días hábiles...`);

  const records = [];
  const supervisorId = signer.id;

  for (const worker of insertedWorkers) {
    for (const day of workdays) {
      // ~6% de ausencias — no todos los días tienen marcación.
      if (randomInt(1, 100) <= 6) continue;

      // El proyecto se elige al azar por día: un trabajador puede pasar de
      // un proyecto a otro entre jornadas.
      const project = projects[randomInt(0, projects.length - 1)];

      const entrada = atTime(day, randomInt(6, 8), randomInt(0, 55));
      records.push({
        worker_id: worker.id,
        project_id: project.id,
        supervisor_id: supervisorId,
        type: "entrada",
        recorded_at: entrada.toISOString(),
      });

      // ~2% quedan sin salida (probar "Sin Marcación" en reportes).
      if (randomInt(1, 100) <= 2) continue;

      const hasOvertime = randomInt(1, 100) <= 20;
      const salidaHour = hasOvertime ? randomInt(18, 20) : randomInt(16, 17);
      const salida = atTime(day, salidaHour, randomInt(0, 55));
      records.push({
        worker_id: worker.id,
        project_id: project.id,
        supervisor_id: supervisorId,
        type: "salida",
        recorded_at: salida.toISOString(),
        observations: hasOvertime ? "Turno extendido por cierre de jornada." : null,
      });
    }
  }

  console.log(`Insertando ${records.length} registros de asistencia...`);
  await insertInChunks("attendance_records", records);

  console.log("Listo:");
  console.log(`  Proyectos: ${projects.map((p) => p.name).join(", ")}`);
  console.log(`  Trabajadores mock: ${insertedWorkers.length}`);
  console.log(`  Días hábiles cubiertos: ${workdays.length}`);
  console.log(`  Registros de asistencia creados: ${records.length}`);
}

main().catch((error) => {
  console.error("Error sembrando datos mock de nómina:", error);
  process.exit(1);
});
