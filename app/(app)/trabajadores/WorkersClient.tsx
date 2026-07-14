"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Worker } from "@/lib/types";
import { WorkerQrCard } from "@/components/WorkerQrCard";
import { Pagination } from "@/components/Pagination";
import type { WorkerStatusFilter } from "./page";
import {
  createWorker,
  toggleWorkerActive,
  updateWorkerSalary,
  type WorkerFormState,
} from "./actions";
import { WorkerSearchBar } from "./WorkerSearchBar";

const initialState: WorkerFormState = {};

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

const STATUS_TABS: { value: WorkerStatusFilter; label: string }[] = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "all", label: "Todos" },
];

function formatSalary(value: number | null): string {
  if (value == null) return "Sin salario cargado";
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function statusHref(status: WorkerStatusFilter, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "active") params.set("estado", status);
  const qs = params.toString();
  return qs ? `/trabajadores?${qs}` : "/trabajadores";
}

export function WorkersClient({
  workers,
  totalCount,
  page,
  totalPages,
  query,
  status,
}: {
  workers: Worker[];
  totalCount: number;
  page: number;
  totalPages: number;
  query: string;
  status: WorkerStatusFilter;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createWorker, initialState);
  const [qrWorker, setQrWorker] = useState<Worker | null>(null);
  const [salaryEditorId, setSalaryEditorId] = useState<string | null>(null);
  const [salaryDraft, setSalaryDraft] = useState("");
  const [savingSalary, setSavingSalary] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  const [createOpen, setCreateOpen] = useState(false);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      // Remonta el formulario (key distinta) para limpiar los campos.
      setFormKey((key) => key + 1);
      setCreateOpen(false);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCreateOpen((open) => !open)}
            className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand"
          >
            {createOpen ? "Cancelar" : "+ Nuevo trabajador"}
          </button>
        </div>

        {createOpen && (
          <form
            key={formKey}
            action={formAction}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Nombre completo
              </label>
              <input
                name="full_name"
                required
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
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Fecha de nacimiento (opcional)
              </label>
              <input
                name="birth_date"
                type="date"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Tipo de sangre (opcional)
              </label>
              <select
                name="blood_type"
                defaultValue=""
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
                Correo electrónico (opcional)
              </label>
              <input
                name="email"
                type="email"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Celular (opcional)
              </label>
              <input
                name="phone"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Cargo (opcional)
              </label>
              <input
                name="job_title"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60 sm:w-auto"
              >
                {pending ? "Creando..." : "Crear y generar QR"}
              </button>
            </div>
          </form>
        )}
        {state.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-neutral-900">
            Trabajadores ({totalCount})
          </h2>
          <WorkerSearchBar initialQuery={query} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={statusHref(tab.value, query)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                status === tab.value
                  ? "bg-brand-dark text-white"
                  : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {workers.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {query
              ? "No se encontraron trabajadores con ese criterio."
              : "Aún no hay trabajadores en este filtro."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {worker.full_name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Doc: {worker.document_id}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      worker.active
                        ? "bg-brand-light text-brand-dark"
                        : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {worker.active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                {worker.job_title && (
                  <p className="text-xs text-neutral-500">{worker.job_title}</p>
                )}

                {salaryEditorId === worker.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      autoFocus
                      value={salaryDraft}
                      onChange={(e) => setSalaryDraft(e.target.value)}
                      className="w-28 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
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
                      {savingSalary ? "..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => setSalaryEditorId(null)}
                      className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
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

                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => setQrWorker(worker)}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    QR
                  </button>
                  <button
                    onClick={async () => {
                      await toggleWorkerActive(worker.id, !worker.active);
                      router.refresh();
                    }}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {worker.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          basePath="/trabajadores"
          searchParams={{ q: query || undefined, estado: status !== "active" ? status : undefined }}
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
