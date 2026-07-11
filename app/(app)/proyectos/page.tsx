import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Profile, Project } from "@/lib/types";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProyectosPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/asistencia");

  const supabase = await createClient();
  const [{ data: projects }, { data: supervisors }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, code, name, active, created_at")
      .order("code"),
    supabase
      .from("profiles")
      .select("id, full_name, role, project_id, created_at")
      .eq("role", "supervisor"),
  ]);

  const supervisorsByProject: Record<string, Profile[]> = {};
  for (const supervisor of (supervisors as Profile[]) ?? []) {
    if (!supervisor.project_id) continue;
    (supervisorsByProject[supervisor.project_id] ??= []).push(supervisor);
  }

  return (
    <ProjectsClient
      projects={(projects as Project[]) ?? []}
      supervisorsByProject={supervisorsByProject}
    />
  );
}
