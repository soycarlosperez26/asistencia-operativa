"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import {
  createProject,
  deleteProject,
  toggleProjectActive,
  type ActionState,
} from "./actions";

const initialState: ActionState = {};

function ProjectRow({
  project,
  archived,
  rowError,
  setRowError,
}: {
  project: Project;
  archived: boolean;
  rowError: string | undefined;
  setRowError: (error: string | undefined) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <li className="py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-neutral-900">{project.name}</p>
          <p className="text-sm text-neutral-500">
            <span
              className={project.active ? "text-brand-dark" : "text-neutral-400"}
            >
              {project.active ? "Activo" : "Archivado"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setRowError(undefined);
              await toggleProjectActive(project.id, !project.active);
              setPending(false);
              router.refresh();
            }}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            {project.active ? "Archivar" : "Restaurar"}
          </button>
          {archived && (
            <button
              disabled={pending}
              onClick={async () => {
                if (
                  !window.confirm(
                    `¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`
                  )
                )
                  return;
                setPending(true);
                setRowError(undefined);
                const result = await deleteProject(project.id);
                setPending(false);
                if (result.error) setRowError(result.error);
                router.refresh();
              }}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
      {rowError && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {rowError}
        </p>
      )}
    </li>
  );
}

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const [state, formAction, pending] = useActionState(createProject, initialState);
  const [formKey, setFormKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  const [rowErrors, setRowErrors] = useState<Record<string, string | undefined>>({});

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setFormKey((key) => key + 1);
  }

  const activeProjects = projects.filter((project) => project.active);
  const archivedProjects = projects.filter((project) => !project.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Proyectos</h1>
        <p className="text-sm text-neutral-500">
          Hasta 15 proyectos/obras activos. Cualquier supervisor puede
          registrar asistencia en cualquiera de ellos.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Nuevo proyecto
        </h2>
        <form
          key={formKey}
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="sm:min-w-[220px] sm:flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nombre
            </label>
            <input
              name="name"
              placeholder="Nombre de la obra o proyecto"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60 sm:w-auto"
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
          Proyectos activos ({activeProjects.length})
        </h2>

        {activeProjects.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No hay proyectos activos.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {activeProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                archived={false}
                rowError={rowErrors[project.id]}
                setRowError={(error) =>
                  setRowErrors((prev) => ({ ...prev, [project.id]: error }))
                }
              />
            ))}
          </ul>
        )}
      </div>

      {archivedProjects.length > 0 && (
        <details className="rounded-2xl bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-lg font-bold text-neutral-900">
            Proyectos archivados ({archivedProjects.length})
          </summary>
          <ul className="mt-4 divide-y divide-neutral-100">
            {archivedProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                archived
                rowError={rowErrors[project.id]}
                setRowError={(error) =>
                  setRowErrors((prev) => ({ ...prev, [project.id]: error }))
                }
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
