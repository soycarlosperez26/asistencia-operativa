"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { Logo } from "@/components/Logo";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto mb-4 h-24 w-24 object-contain" />
        <h1 className="text-2xl font-bold text-neutral-900">Bienvenido</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Inicia sesión para continuar
        </p>
      </div>

      <div className="mt-8 w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-center text-lg font-bold text-neutral-900">
          Iniciar Sesión
        </h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nombre@empresa.com"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-dark py-2.5 text-sm font-semibold text-white transition hover:bg-brand disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
