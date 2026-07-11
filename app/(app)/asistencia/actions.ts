"use server";

import { createClient } from "@/lib/supabase/server";
import { nextAttendanceType } from "@/lib/attendance";
import type { AttendanceRecordWithRelations, AttendanceType } from "@/lib/types";

export interface RegisterAttendanceInput {
  qrToken: string;
  projectId: string;
  gps: { lat: number; lng: number; accuracy: number } | null;
}

export interface RegisterAttendanceResult {
  data?: AttendanceRecordWithRelations;
  error?: string;
}

export async function registerAttendance(
  input: RegisterAttendanceInput
): Promise<RegisterAttendanceResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesión expirada. Vuelve a iniciar sesión." };
  }

  const qrToken = input.qrToken.trim();
  if (!qrToken) {
    return { error: "QR inválido." };
  }

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .select("id, full_name, document_id, active")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (workerError || !worker) {
    return { error: "No se encontró un trabajador con este QR." };
  }

  if (!worker.active) {
    return { error: `${worker.full_name} está inactivo.` };
  }

  const { data: lastRecord } = await supabase
    .from("attendance_records")
    .select("type")
    .eq("worker_id", worker.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ type: AttendanceType }>();

  const type = nextAttendanceType(lastRecord?.type ?? null);

  const { data: inserted, error: insertError } = await supabase
    .from("attendance_records")
    .insert({
      worker_id: worker.id,
      project_id: input.projectId,
      supervisor_id: user.id,
      type,
      gps_lat: input.gps?.lat ?? null,
      gps_lng: input.gps?.lng ?? null,
      gps_accuracy: input.gps?.accuracy ?? null,
    })
    .select(
      "id, worker_id, project_id, supervisor_id, type, recorded_at, gps_lat, gps_lng, gps_accuracy, worker:workers(id, full_name, document_id), project:projects(id, code, name), supervisor:profiles(id, full_name)"
    )
    .single();

  if (insertError || !inserted) {
    return { error: "No se pudo registrar la asistencia. Intenta de nuevo." };
  }

  return { data: inserted as unknown as AttendanceRecordWithRelations };
}
