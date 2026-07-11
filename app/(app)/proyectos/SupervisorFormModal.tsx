"use client";

import { useActionState, useEffect } from "react";
import type { Project } from "@/lib/types";
import { createSupervisor, type ActionState } from "./actions";

const initialState: ActionState = {};

export function SupervisorFormModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createSupervisor,
    initialState
  );

  useEffect(() => {
    if (state.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-neutral-900">
          Nuevo supervisor
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Se asignará a {project.code} - {project.name}
        </p>

        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="project_id" value={project.id} />
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
              Correo
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Contraseña temporal
            </label>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
            >
              {pending ? "Creando..." : "Crear supervisor"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
