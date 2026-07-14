import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Project } from "@/lib/types";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProyectosPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/asistencia");

  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, active, created_at")
    .order("name");

  return <ProjectsClient projects={(projects as Project[]) ?? []} />;
}
