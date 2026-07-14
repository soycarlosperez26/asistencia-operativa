import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { ALL_PROJECTS_VALUE, startOfTodayLocal } from "@/lib/attendance";
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

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, active, created_at")
    .eq("active", true)
    .order("name");
  const projects: Project[] = projectsData ?? [];

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-neutral-900">
          Sin proyectos activos
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {profile.role === "admin"
            ? "No hay proyectos activos todavía."
            : "Contacta al administrador para que cree un proyecto."}
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

  const selectedValue = projectParam ?? projects[0].id;
  const viewingAll = selectedValue === ALL_PROJECTS_VALUE;
  const project = viewingAll
    ? null
    : projects.find((p) => p.id === selectedValue) ?? projects[0];

  let recordsQuery = supabase
    .from("attendance_records")
    .select(
      "id, worker_id, project_id, supervisor_id, type, recorded_at, gps_lat, gps_lng, gps_accuracy, observations, worker:workers(id, full_name, document_id), project:projects(id, name), supervisor:profiles(id, full_name)"
    )
    .gte("recorded_at", startOfTodayLocal())
    .order("recorded_at", { ascending: false });

  if (!viewingAll && project) {
    recordsQuery = recordsQuery.eq("project_id", project.id);
  }

  const { data: todayRecords } = await recordsQuery;

  return (
    <AttendanceClient
      project={project}
      projects={projects}
      selectedValue={selectedValue}
      initialRecords={
        (todayRecords as unknown as AttendanceRecordWithRelations[]) ?? []
      }
    />
  );
}
