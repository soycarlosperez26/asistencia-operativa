"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { Worker } from "@/lib/types";
import { WorkerQrCard } from "@/components/WorkerQrCard";
import { createWorker, toggleWorkerActive, type WorkerFormState } from "./actions";

const initialState: WorkerFormState = {};

export function WorkersClient({ workers }: { workers: Worker[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createWorker, initialState);
  const [qrWorker, setQrWorker] = useState<Worker | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      // Remonta el formulario (key distinta) para limpiar los campos.
      setFormKey((key) => key + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Trabajadores</h1>
        <p className="text-sm text-neutral-500">
          Administra el carnet QR de cada trabajador.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Nuevo trabajador
        </h2>
        <form
          key={formKey}
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="sm:min-w-[200px] sm:flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nombre completo
            </label>
            <input
              name="full_name"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:min-w-[160px] sm:flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Documento
            </label>
            <input
              name="document_id"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Creando..." : "Crear y generar QR"}
          </button>
        </form>
        {state.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Todos los trabajadores ({workers.length})
        </h2>

        {workers.length === 0 ? (
          <p className="text-sm text-neutral-500">Aún no hay trabajadores.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {workers.map((worker) => (
              <li
                key={worker.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-neutral-900">
                    {worker.full_name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Doc: {worker.document_id} ·{" "}
                    <span
                      className={worker.active ? "text-brand-dark" : "text-neutral-400"}
                    >
                      {worker.active ? "Activo" : "Inactivo"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQrWorker(worker)}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 sm:flex-none"
                  >
                    Ver carnet QR
                  </button>
                  <button
                    onClick={async () => {
                      await toggleWorkerActive(worker.id, !worker.active);
                      router.refresh();
                    }}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 sm:flex-none"
                  >
                    {worker.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {qrWorker && (
        <WorkerQrCard worker={qrWorker} onClose={() => setQrWorker(null)} />
      )}
    </div>
  );
}
