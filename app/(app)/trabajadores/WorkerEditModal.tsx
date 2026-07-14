"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Worker } from "@/lib/types";
import { updateWorker, type WorkerFormState } from "./actions";

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const ARL_LEVELS = [1, 2, 3, 4, 5];

const initialState: WorkerFormState = {};

export function WorkerEditModal({
  worker,
  onClose,
}: {
  worker: Worker;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateWorker, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Editar trabajador
            </h2>
            <p className="text-xs text-neutral-500">Doc: {worker.document_id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cerrar
          </button>
        </div>

        <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={worker.id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nombre completo
            </label>
            <input
              name="full_name"
              required
              defaultValue={worker.full_name}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Documento
            </label>
            <input
              name="document_id"
              required
              defaultValue={worker.document_id}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Salario mensual
            </label>
            <input
              name="monthly_salary"
              type="number"
              min="0"
              step="0.01"
              defaultValue={worker.monthly_salary ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nivel de riesgo ARL
            </label>
            <select
              name="arl_risk_level"
              defaultValue={worker.arl_risk_level}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {ARL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  Nivel {level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Fecha de nacimiento
            </label>
            <input
              name="birth_date"
              type="date"
              defaultValue={worker.birth_date ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Tipo de sangre
            </label>
            <select
              name="blood_type"
              defaultValue={worker.blood_type ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">Sin especificar</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Correo electrónico
            </label>
            <input
              name="email"
              type="email"
              defaultValue={worker.email ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Celular
            </label>
            <input
              name="phone"
              defaultValue={worker.phone ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Cargo
            </label>
            <input
              name="job_title"
              defaultValue={worker.job_title ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Notas
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={worker.notes ?? ""}
              placeholder="Observaciones sobre el trabajador..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
            >
              {pending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
