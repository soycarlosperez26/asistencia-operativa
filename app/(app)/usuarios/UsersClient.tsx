"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Project, UserRole } from "@/lib/types";
import {
  createUser,
  deleteUser,
  updateUserPassword,
  updateUserRole,
  type ActionState,
} from "./actions";

export interface UserRow extends Profile {
  email: string;
}

const initialState: ActionState = {};

export function UsersClient({
  users,
  projects,
  currentUserId,
}: {
  users: UserRow[];
  projects: Project[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const [formKey, setFormKey] = useState(0);
  const [newUserRole, setNewUserRole] = useState<UserRole>("supervisor");
  const [prevState, setPrevState] = useState(state);

  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [passwordEditorId, setPasswordEditorId] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<Record<string, UserRole>>({});

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      setFormKey((key) => key + 1);
      setNewUserRole("supervisor");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Usuarios</h1>
        <p className="text-sm text-neutral-500">
          Administra las cuentas, roles y contraseñas del sistema.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Nuevo usuario
        </h2>
        <form
          key={formKey}
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="sm:min-w-[180px] sm:flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Nombre completo
            </label>
            <input
              name="full_name"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="sm:min-w-[200px] sm:flex-1">
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
          <div className="sm:min-w-[160px] sm:flex-1">
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
          <div className="sm:min-w-[140px]">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Rol
            </label>
            <select
              name="role"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {newUserRole === "supervisor" && (
            <div className="sm:min-w-[180px] sm:flex-1">
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Proyecto
              </label>
              <select
                name="project_id"
                required
                defaultValue=""
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="" disabled>
                  Selecciona un proyecto
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Creando..." : "Crear usuario"}
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
          Todos los usuarios ({users.length})
        </h2>

        {users.length === 0 ? (
          <p className="text-sm text-neutral-500">Aún no hay usuarios.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <li key={user.id} className="flex flex-col gap-3 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {user.full_name}
                        {isSelf && (
                          <span className="ml-2 text-xs font-normal text-neutral-400">
                            (tú)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-neutral-500">{user.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const displayedRole = roleDraft[user.id] ?? user.role;
                        return (
                          <>
                            <select
                              value={displayedRole}
                              disabled={isSelf || savingId === user.id}
                              onChange={async (e) => {
                                const role = e.target.value as UserRole;

                                if (role === "supervisor") {
                                  // Muestra el selector de proyecto sin guardar
                                  // todavía — evita el problema de necesitar un
                                  // proyecto ya asignado para poder elegir uno.
                                  setRoleDraft((prev) => ({ ...prev, [user.id]: role }));
                                  setRowError((prev) => ({
                                    ...prev,
                                    [user.id]: "Selecciona un proyecto para completar la asignación.",
                                  }));
                                  return;
                                }

                                setSavingId(user.id);
                                const result = await updateUserRole(user.id, role, null);
                                setSavingId(null);
                                setRoleDraft((prev) => {
                                  const next = { ...prev };
                                  delete next[user.id];
                                  return next;
                                });
                                setRowError((prev) => ({
                                  ...prev,
                                  [user.id]: result.error ?? "",
                                }));
                                router.refresh();
                              }}
                              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-60"
                            >
                              <option value="supervisor">Supervisor</option>
                              <option value="admin">Administrador</option>
                            </select>

                            {displayedRole === "supervisor" && (
                              <select
                                value={user.role === "supervisor" ? user.project_id ?? "" : ""}
                                disabled={isSelf || savingId === user.id}
                                onChange={async (e) => {
                                  const projectId = e.target.value || null;
                                  if (!projectId) return;
                                  setSavingId(user.id);
                                  const result = await updateUserRole(
                                    user.id,
                                    "supervisor",
                                    projectId
                                  );
                                  setSavingId(null);
                                  setRoleDraft((prev) => {
                                    const next = { ...prev };
                                    delete next[user.id];
                                    return next;
                                  });
                                  setRowError((prev) => ({
                                    ...prev,
                                    [user.id]: result.error ?? "",
                                  }));
                                  router.refresh();
                                }}
                                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-60"
                              >
                                <option value="" disabled>
                                  Selecciona un proyecto
                                </option>
                                {projects.map((project) => (
                                  <option key={project.id} value={project.id}>
                                    {project.code}
                                  </option>
                                ))}
                              </select>
                            )}
                          </>
                        );
                      })()}

                      <button
                        onClick={() => {
                          setPasswordEditorId(
                            passwordEditorId === user.id ? null : user.id
                          );
                          setPasswordDraft("");
                        }}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Cambiar contraseña
                      </button>

                      <button
                        disabled={isSelf}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `¿Eliminar a ${user.full_name}? Esta acción no se puede deshacer.`
                            )
                          )
                            return;
                          setSavingId(user.id);
                          const result = await deleteUser(user.id);
                          setSavingId(null);
                          if (result.error) {
                            setRowError((prev) => ({
                              ...prev,
                              [user.id]: result.error!,
                            }));
                          }
                          router.refresh();
                        }}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {passwordEditorId === user.id && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 p-3">
                      <input
                        type="password"
                        minLength={8}
                        autoFocus
                        placeholder="Nueva contraseña (mín. 8 caracteres)"
                        value={passwordDraft}
                        onChange={(e) => setPasswordDraft(e.target.value)}
                        className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      />
                      <button
                        disabled={savingId === user.id}
                        onClick={async () => {
                          setSavingId(user.id);
                          const result = await updateUserPassword(
                            user.id,
                            passwordDraft
                          );
                          setSavingId(null);
                          setRowError((prev) => ({
                            ...prev,
                            [user.id]: result.error ?? "",
                          }));
                          if (!result.error) {
                            setPasswordEditorId(null);
                            setPasswordDraft("");
                          }
                        }}
                        className="rounded-lg bg-brand-dark px-3 py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
                      >
                        {savingId === user.id ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        onClick={() => setPasswordEditorId(null)}
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {rowError[user.id] &&
                    (rowError[user.id] ===
                    "Selecciona un proyecto para completar la asignación." ? (
                      <p className="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">
                        {rowError[user.id]}
                      </p>
                    ) : (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {rowError[user.id]}
                      </p>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
