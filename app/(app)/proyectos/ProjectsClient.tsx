"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Project } from "@/lib/types";
import { SupervisorFormModal } from "./SupervisorFormModal";
import { createProject, toggleProjectActive, type ActionState } from "./actions";

const initialState: ActionState = {};

export function ProjectsClient({
  projects,
  supervisorsByProject,
}: {
  projects: Project[];
  supervisorsByProject: Record<string, Profile[]>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createProject, initialState);
  const [formKey, setFormKey] = useState(0);
  const [supervisorProject, setSupervisorProject] = useState<Project | null>(null);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setFormKey((key) => key + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Proyectos</h1>
        <p className="text-sm text-neutral-500">
          Hasta 15 proyectos/obras activos. Cada uno tiene un supervisor
          asignado.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Nuevo proyecto
        </h2>
        <form key={formKey} action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Código
            </label>
            <input
              name="code"
              placeholder="P26001-TEBSA"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nombre
            </label>
            <input
              name="name"
              placeholder="TEBSA PATIO 220KV - TERMOBARRANQUILLA"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
          >
            {pending ? "Creando..." : "Crear proyecto"}
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
          Todos los proyectos ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <p className="text-sm text-neutral-500">Aún no hay proyectos.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {projects.map((project) => {
              const supervisors = supervisorsByProject[project.id] ?? [];
              return (
                <li key={project.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {project.code} - {project.name}
                      </p>
                      <p className="text-sm text-neutral-500">
                        <span
                          className={
                            project.active ? "text-brand-dark" : "text-neutral-400"
                          }
                        >
                          {project.active ? "Activo" : "Inactivo"}
                        </span>
                        {" · "}
                        {supervisors.length > 0
                          ? `Supervisor: ${supervisors.map((s) => s.full_name).join(", ")}`
                          : "Sin supervisor asignado"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSupervisorProject(project)}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Agregar supervisor
                      </button>
                      <button
                        onClick={async () => {
                          await toggleProjectActive(project.id, !project.active);
                          router.refresh();
                        }}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        {project.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {supervisorProject && (
        <SupervisorFormModal
          project={supervisorProject}
          onClose={() => {
            setSupervisorProject(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
