"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Logo } from "@/components/Logo";
import type { Worker } from "@/lib/types";

interface WorkerQrCardProps {
  worker: Worker;
  onClose: () => void;
}

export function WorkerQrCard({ worker, onClose }: WorkerQrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    QRCode.toDataURL(worker.qr_token, { width: 320, margin: 1 }).then(
      setQrDataUrl
    );
  }, [worker.qr_token]);

  function handleDownload() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `carnet-${worker.document_id}.png`;
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 print:static print:bg-white">
      <div
        ref={cardRef}
        className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl print:shadow-none"
      >
        <Logo className="mx-auto h-14 w-14 object-contain" />
        <p className="mt-3 text-base font-bold text-neutral-900">
          {worker.full_name}
        </p>
        <p className="text-sm text-neutral-500">Doc: {worker.document_id}</p>

        <div className="mx-auto mt-4 flex h-56 w-56 items-center justify-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt={`QR de ${worker.full_name}`} />
          ) : (
            <div className="h-full w-full animate-pulse rounded-lg bg-neutral-100" />
          )}
        </div>

        <div className="mt-5 flex gap-2 print:hidden">
          <button
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="flex-1 rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
          >
            Descargar
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
