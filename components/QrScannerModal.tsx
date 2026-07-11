"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface QrScannerModalProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );

  useEffect(() => {
    let cancelled = false;
    scannedRef.current = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        if (!cancelled) {
          setError(
            "No se pudo acceder a la cámara. Revisa los permisos del navegador."
          );
        }
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || scannedRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            scannedRef.current = true;
            onScan(code.data);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Escanear código QR
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Apunta la cámara al QR del trabajador para registrar asistencia.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-neutral-400 hover:text-neutral-600"
          >
            ✕
          </button>
        </div>

        <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-dashed border-white/70" />
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() =>
              setFacingMode((mode) =>
                mode === "environment" ? "user" : "environment"
              )
            }
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cambiar cámara
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white hover:bg-brand"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
