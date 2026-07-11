"use client";

import { signOut } from "./actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
