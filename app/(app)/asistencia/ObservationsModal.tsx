"use client";

import { useState } from "react";

interface ObservationsModalProps {
  workerName: string;
  pending: boolean;
  onConfirm: (observations: string) => void;
  onCancel: () => void;
}

export function ObservationsModal({
  workerName,
  pending,
  onConfirm,
  onCancel,
}: ObservationsModalProps) {
  const [observations, setObservations] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-neutral-900">Observaciones</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Registrando asistencia para <strong>{workerName}</strong>. Puedes
          agregar una observación antes de guardar.
        </p>

        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={4}
          placeholder="Opcional: novedades, motivo de la marcación, etc."
          className="mt-4 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(observations)}
            disabled={pending}
            className="flex-1 rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Registrar Asistencia"}
          </button>
        </div>
      </div>
    </div>
  );
}
