"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { Worker } from "@/lib/types";
import { WorkerQrCard } from "@/components/WorkerQrCard";
import { Pagination } from "@/components/Pagination";
import {
  createWorker,
  toggleWorkerActive,
  updateWorkerSalary,
  type WorkerFormState,
} from "./actions";
import { WorkerSearchBar } from "./WorkerSearchBar";

const initialState: WorkerFormState = {};

function formatSalary(value: number | null): string {
  if (value == null) return "Sin salario cargado";
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export function WorkersClient({
  workers,
  totalCount,
  page,
  totalPages,
  query,
}: {
  workers: Worker[];
  totalCount: number;
  page: number;
  totalPages: number;
  query: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createWorker, initialState);
  const [qrWorker, setQrWorker] = useState<Worker | null>(null);
  const [salaryEditorId, setSalaryEditorId] = useState<string | null>(null);
  const [salaryDraft, setSalaryDraft] = useState("");
  const [savingSalary, setSavingSalary] = useState(false);
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
          <div className="sm:min-w-[160px] sm:flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Salario mensual (opcional)
            </label>
            <input
              name="monthly_salary"
              type="number"
              min="0"
              step="0.01"
              placeholder="1750905"
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
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-neutral-900">
            Todos los trabajadores ({totalCount})
          </h2>
          <WorkerSearchBar initialQuery={query} />
        </div>

        {workers.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {query
              ? "No se encontraron trabajadores con ese criterio."
              : "Aún no hay trabajadores."}
          </p>
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
                  {salaryEditorId === worker.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        autoFocus
                        value={salaryDraft}
                        onChange={(e) => setSalaryDraft(e.target.value)}
                        className="w-36 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      />
                      <button
                        disabled={savingSalary}
                        onClick={async () => {
                          const value = Number(salaryDraft);
                          if (!Number.isFinite(value) || value < 0) return;
                          setSavingSalary(true);
                          await updateWorkerSalary(worker.id, value);
                          setSavingSalary(false);
                          setSalaryEditorId(null);
                          router.refresh();
                        }}
                        className="rounded-lg bg-brand-dark px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand disabled:opacity-60"
                      >
                        {savingSalary ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        onClick={() => setSalaryEditorId(null)}
                        className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-neutral-500">
                      {formatSalary(worker.monthly_salary)}{" "}
                      <button
                        onClick={() => {
                          setSalaryDraft(String(worker.monthly_salary ?? ""));
                          setSalaryEditorId(worker.id);
                        }}
                        className="font-medium text-brand-dark hover:underline"
                      >
                        Editar
                      </button>
                    </p>
                  )}
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

        <Pagination
          basePath="/trabajadores"
          searchParams={{ q: query || undefined }}
          page={page}
          totalPages={totalPages}
          totalItems={totalCount}
        />
      </div>

      {qrWorker && (
        <WorkerQrCard worker={qrWorker} onClose={() => setQrWorker(null)} />
      )}
    </div>
  );
}
