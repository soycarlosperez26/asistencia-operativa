// Genera datos mock de asistencia (trabajadores + registros de entrada/salida)
// directo en Supabase, usando la service role key. Pensado solo para
// entornos de prueba — nunca correr contra una base de producción real.
//
// Uso: npm run seed:mock

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Node 20 no trae WebSocket global (llegó estable en Node 22); el cliente de
// Supabase lo necesita para inicializar el módulo realtime, aunque este
// script no lo use.
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

const MOCK_PROJECTS = [
  { code: "P001-OBRA-NORTE", name: "Obra Norte - Mantenimiento Industrial" },
  { code: "P002-OBRA-SUR", name: "Obra Sur - Suministro e Instalación" },
  { code: "P003-PLANTA", name: "Planta Principal - Mantenimiento Preventivo" },
];

const MOCK_WORKERS = [
  { full_name: "GUSTAVO ADOLFO PÉREZ CASSIANI", document_id: "99510014481" },
  { full_name: "ANGIE PAOLA HERNANDEZ GOMEZ", document_id: "99510924882" },
  { full_name: "LUIS ALBERTO SAMPER ESCOBAR", document_id: "99511402463" },
  { full_name: "ADOLFO ANTONIO RODRIGUEZ DE ALBA", document_id: "99508786644" },
  { full_name: "NUMA POMPILIO BARBA DE CARO", document_id: "99500868525" },
  { full_name: "MARIA JOSE CASTRO OSPINO", document_id: "99512045316" },
  { full_name: "CARLOS EDUARDO MENDOZA RUIZ", document_id: "99509321457" },
  { full_name: "DIANA PATRICIA VILLA ACOSTA", document_id: "99511876238" },
  { full_name: "JORGE LUIS TORRES NAVARRO", document_id: "99507654129" },
  { full_name: "SANDRA MILENA OROZCO PEÑA", document_id: "99513298760" },
];

function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function recentWorkdays(count) {
  const days = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.length < count) {
    if (isWeekday(cursor)) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
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

async function main() {
  console.log("Consultando proyectos existentes...");
  const { data: existingProjects, error: projectsError } = await supabase
    .from("projects")
    .select("id, code, name");
  if (projectsError) throw projectsError;

  let projects = existingProjects ?? [];
  if (projects.length === 0) {
    console.log("No hay proyectos, creando proyectos mock...");
    const { data: inserted, error } = await supabase
      .from("projects")
      .insert(MOCK_PROJECTS)
      .select("id, code, name");
    if (error) throw error;
    projects = inserted;
  }
  console.log(`Proyectos disponibles: ${projects.map((p) => p.code).join(", ")}`);

  console.log("Consultando perfiles (admin/supervisor) existentes...");
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, role, project_id");
  if (profilesError) throw profilesError;

  if (!profiles || profiles.length === 0) {
    console.error(
      "No hay ningún perfil (admin/supervisor) en la base todavía.\n" +
        "Creá primero el admin manualmente (ver README, sección 2) antes de sembrar datos mock,\n" +
        "porque attendance_records.supervisor_id necesita un perfil válido."
    );
    process.exit(1);
  }

  const admin = profiles.find((p) => p.role === "admin") ?? profiles[0];
  const supervisorByProject = new Map(
    profiles.filter((p) => p.role === "supervisor" && p.project_id).map((p) => [p.project_id, p.id])
  );

  console.log("Consultando trabajadores existentes...");
  const { data: existingWorkers, error: workersError } = await supabase
    .from("workers")
    .select("id, full_name, document_id");
  if (workersError) throw workersError;

  const existingDocs = new Set((existingWorkers ?? []).map((w) => w.document_id));
  const workersToInsert = MOCK_WORKERS.filter((w) => !existingDocs.has(w.document_id));

  let workers = existingWorkers ?? [];
  if (workersToInsert.length > 0) {
    console.log(`Creando ${workersToInsert.length} trabajadores mock...`);
    const { data: inserted, error } = await supabase
      .from("workers")
      .insert(workersToInsert)
      .select("id, full_name, document_id");
    if (error) throw error;
    workers = [...workers, ...inserted];
  }

  // Solo usamos los trabajadores mock de esta lista (evita tocar trabajadores reales).
  const mockDocs = new Set(MOCK_WORKERS.map((w) => w.document_id));
  const testWorkers = workers.filter((w) => mockDocs.has(w.document_id));

  if (process.argv.includes("--reset") && testWorkers.length > 0) {
    console.log("Borrando registros de asistencia mock anteriores...");
    const { error: deleteError } = await supabase
      .from("attendance_records")
      .delete()
      .in(
        "worker_id",
        testWorkers.map((w) => w.id)
      );
    if (deleteError) throw deleteError;
  }

  console.log(`Generando registros de asistencia para ${testWorkers.length} trabajadores...`);

  const workdays = recentWorkdays(4); // últimos 4 días hábiles
  const records = [];
  let openCasesLeft = 4; // algunas jornadas quedan "sin salida" a propósito

  testWorkers.forEach((worker, workerIndex) => {
    const project = projects[workerIndex % projects.length];
    const supervisorId = supervisorByProject.get(project.id) ?? admin.id;

    // Cada trabajador tiene asistencia en 2-3 de los últimos días hábiles
    // (apunta a ~50 registros totales entre todos los trabajadores mock).
    const daysForWorker = workdays.slice(0, randomInt(2, 3));

    daysForWorker.forEach((day, dayIndex) => {
      const entradaHour = randomInt(7, 8);
      const entradaMinute = randomInt(0, 55);
      const entrada = atTime(day, entradaHour, entradaMinute);

      records.push({
        worker_id: worker.id,
        project_id: project.id,
        supervisor_id: supervisorId,
        type: "entrada",
        recorded_at: entrada.toISOString(),
      });

      const isOpenCase = openCasesLeft > 0 && workerIndex % 3 === 0 && dayIndex === 0;
      if (isOpenCase) {
        openCasesLeft -= 1;
        return; // no se registra la salida — probar "Sin Marcación"
      }

      // Salida normal ~5:30pm, algunas con horas extra hasta las 8pm.
      const hasOvertime = randomInt(0, 4) === 0;
      const salidaHour = hasOvertime ? randomInt(18, 20) : randomInt(16, 17);
      const salidaMinute = randomInt(0, 55);
      const salida = atTime(day, salidaHour, salidaMinute);

      records.push({
        worker_id: worker.id,
        project_id: project.id,
        supervisor_id: supervisorId,
        type: "salida",
        recorded_at: salida.toISOString(),
        observations: hasOvertime ? "Turno extendido por cierre de jornada." : null,
      });
    });
  });

  console.log(`Insertando ${records.length} registros de asistencia...`);
  const { error: insertError } = await supabase.from("attendance_records").insert(records);
  if (insertError) throw insertError;

  console.log("Listo:");
  console.log(`  Proyectos: ${projects.length}`);
  console.log(`  Trabajadores mock: ${testWorkers.length}`);
  console.log(`  Registros de asistencia creados: ${records.length}`);
}

main().catch((error) => {
  console.error("Error sembrando datos mock:", error);
  process.exit(1);
});
