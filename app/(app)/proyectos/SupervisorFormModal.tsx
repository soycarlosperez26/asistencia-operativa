"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import type { Project, UserRole } from "@/lib/types";
import { assignSupervisor, type ActionState } from "./actions";

export interface AssignableUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  project_id: string | null;
}

const initialState: ActionState = {};

export function SupervisorFormModal({
  project,
  users,
  onClose,
}: {
  project: Project;
  users: AssignableUser[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    assignSupervisor,
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
          Asignar supervisor
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Selecciona un usuario existente para {project.code} - {project.name}
          .
        </p>

        {users.length === 0 ? (
          <p className="mt-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            No hay usuarios creados todavía.{" "}
            <Link href="/usuarios" className="font-semibold underline">
              Crea uno en Usuarios
            </Link>
            .
          </p>
        ) : (
          <form action={formAction} className="mt-4 space-y-3">
            <input type="hidden" name="project_id" value={project.id} />
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Usuario
              </label>
              <select
                name="user_id"
                required
                defaultValue=""
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="" disabled>
                  Selecciona un usuario
                </option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email || "sin correo"})
                    {user.role === "supervisor" && user.project_id === project.id
                      ? " — ya asignado aquí"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <p className="text-xs text-neutral-400">
              ¿Necesitas un usuario nuevo?{" "}
              <Link
                href="/usuarios"
                className="font-medium text-brand-dark underline"
              >
                Créalo en Usuarios
              </Link>
              .
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
              >
                {pending ? "Asignando..." : "Asignar supervisor"}
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
        )}
      </div>
    </div>
  );
}
