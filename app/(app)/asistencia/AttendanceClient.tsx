"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGps } from "@/lib/useGps";
import { ALL_PROJECTS_VALUE, computePresentCount } from "@/lib/attendance";
import { BOGOTA_TIME_ZONE } from "@/lib/timezone";
import { GPS_ENABLED } from "@/lib/config";
import { QrScannerModal } from "@/components/QrScannerModal";
import type { AttendanceRecordWithRelations, Project } from "@/lib/types";
import { lookupWorkerByQr, registerAttendance } from "./actions";
import { ObservationsModal } from "./ObservationsModal";

interface AttendanceClientProps {
  project: Project | null;
  projects: Project[];
  selectedValue: string;
  initialRecords: AttendanceRecordWithRelations[];
}

interface PendingScan {
  qrToken: string;
  workerName: string;
}

export function AttendanceClient({
  project,
  projects,
  selectedValue,
  initialRecords,
}: AttendanceClientProps) {
  const router = useRouter();
  const viewingAll = project === null;
  const [records, setRecords] = useState(initialRecords);
  const [prevInitialRecords, setPrevInitialRecords] = useState(initialRecords);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const gps = useGps(GPS_ENABLED);

  if (initialRecords !== prevInitialRecords) {
    setPrevInitialRecords(initialRecords);
    setRecords(initialRecords);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`attendance-${project?.id ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_records",
          ...(project ? { filter: `project_id=eq.${project.id}` } : {}),
        },
        async () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project, router]);

  const presentCount = useMemo(() => computePresentCount(records), [records]);

  async function handleScan(qrToken: string) {
    setScannerOpen(false);
    setPending(true);
    setFeedback(null);

    const result = await lookupWorkerByQr(qrToken);

    setPending(false);

    if (result.error || !result.worker) {
      setFeedback({ type: "error", message: result.error ?? "Error desconocido." });
      return;
    }

    setPendingScan({ qrToken, workerName: result.worker?.full_name ?? "Supervisor" });
  }

  async function handleConfirmObservations(observations: string) {
    if (!pendingScan || !project) return;
    setPending(true);
    setFeedback(null);

    const result = await registerAttendance({
      qrToken: pendingScan.qrToken,
      projectId: project.id,
      gps:
        GPS_ENABLED && gps.reading
          ? { lat: gps.reading.lat, lng: gps.reading.lng, accuracy: gps.reading.accuracy }
          : null,
      observations: observations.trim() || null,
    });

    setPending(false);
    setPendingScan(null);

    if (result.error || !result.data) {
      setFeedback({ type: "error", message: result.error ?? "Error desconocido." });
      return;
    }

    setRecords((prev) => {
      if (prev.some((r) => r.id === result.data!.id)) return prev;
      return [result.data!, ...prev];
    });
    setFeedback({
      type: "success",
      message: `${result.data.type === "entrada" ? "Entrada" : "Salida"} registrada para ${result.data.worker.full_name}.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Asistencia</h1>
          <p className="text-sm text-neutral-500">
            Gestiona la asistencia de empleados
          </p>
        </div>
        <button
          onClick={() => setScannerOpen(true)}
          disabled={pending || viewingAll}
          title={viewingAll ? "Selecciona un proyecto para registrar asistencia." : undefined}
          className="w-full rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Registrando..." : "Registrar Asistencia"}
        </button>
      </div>

      {feedback && (
        <p
          className={`rounded-lg px-4 py-2.5 text-sm ${
            feedback.type === "success"
              ? "bg-brand-light text-brand-dark"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Configuración de registro
        </h2>

        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Proyecto
        </label>
        <select
          value={selectedValue}
          onChange={(e) => router.push(`/asistencia?project=${e.target.value}`)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value={ALL_PROJECTS_VALUE}>TODOS LOS PROYECTOS</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {viewingAll && (
          <p className="mt-2 text-xs text-neutral-500">
            Estás viendo la actividad de todos los proyectos. Selecciona uno
            específico para poder registrar asistencia.
          </p>
        )}

        <div className="mt-6">
          <p className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            Empleados Presentes
          </p>
          <p className="mt-1 text-3xl font-bold text-brand-dark">{presentCount}</p>
          <p className="text-xs text-neutral-500">ingresos de hoy</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Actividad Reciente (Hoy)
        </h2>

        {records.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Todavía no hay registros de asistencia hoy.
          </p>
        ) : (
          <ul className="space-y-3">
            {records.slice(0, 20).map((record) => (
              <li
                key={record.id}
                className="rounded-xl bg-neutral-50 px-4 py-3 text-sm"
              >
                <p className="font-semibold text-neutral-900">
                  {record.worker.full_name}
                </p>
                <p className="mt-0.5 text-neutral-500">
                  <span
                    className={`font-semibold ${
                      record.type === "entrada" ? "text-brand-dark" : "text-orange-600"
                    }`}
                  >
                    {record.type.toUpperCase()}
                  </span>{" "}
                  · Doc: {record.worker.document_id} · {record.project.name} · Por:{" "}
                  {record.supervisor?.full_name ?? "Supervisor"}
                </p>
                {record.observations && (
                  <p className="mt-1 rounded-lg bg-white px-2.5 py-1.5 text-xs text-neutral-600">
                    {record.observations}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-neutral-400">
                  {new Date(record.recorded_at).toLocaleString("es-CO", {
                    timeZone: BOGOTA_TIME_ZONE,
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {scannerOpen && (
        <QrScannerModal
          onScan={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {pendingScan && (
        <ObservationsModal
          workerName={pendingScan.workerName}
          pending={pending}
          onConfirm={handleConfirmObservations}
          onCancel={() => setPendingScan(null)}
        />
      )}
    </div>
  );
}
