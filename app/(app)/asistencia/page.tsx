import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { startOfTodayISO } from "@/lib/attendance";
import type { AttendanceRecordWithRelations, Project } from "@/lib/types";
import { AttendanceClient } from "./AttendanceClient";

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectParam } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  let projects: Project[] = [];
  if (profile.role === "admin") {
    const { data } = await supabase
      .from("projects")
      .select("id, code, name, active, created_at")
      .eq("active", true)
      .order("code");
    projects = data ?? [];
  }

  const projectId =
    profile.role === "admin"
      ? projectParam ?? projects[0]?.id
      : profile.project_id ?? undefined;

  if (!projectId) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-neutral-900">
          Sin proyecto asignado
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {profile.role === "admin"
            ? "No hay proyectos activos todavía."
            : "Contacta al administrador para que te asigne un proyecto."}
        </p>
        {profile.role === "admin" && (
          <Link
            href="/proyectos"
            className="mt-4 inline-block rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand"
          >
            Crear proyecto
          </Link>
        )}
      </div>
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, code, name, active, created_at")
    .eq("id", projectId)
    .single<Project>();

  if (!project) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-neutral-500">Proyecto no encontrado.</p>
      </div>
    );
  }

  const { data: todayRecords } = await supabase
    .from("attendance_records")
    .select(
      "id, worker_id, project_id, supervisor_id, type, recorded_at, gps_lat, gps_lng, gps_accuracy, worker:workers(id, full_name, document_id), project:projects(id, code, name), supervisor:profiles(id, full_name)"
    )
    .eq("project_id", project.id)
    .gte("recorded_at", startOfTodayISO())
    .order("recorded_at", { ascending: false });

  return (
    <AttendanceClient
      project={project}
      isAdmin={profile.role === "admin"}
      projects={projects}
      initialRecords={
        (todayRecords as unknown as AttendanceRecordWithRelations[]) ?? []
      }
    />
  );
}
