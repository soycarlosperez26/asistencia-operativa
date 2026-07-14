import { redirect } from "next/navigation";
import { toBogotaWallClock } from "@/lib/timezone";

export default function ParametrosIndexPage() {
  const currentYear = toBogotaWallClock(new Date()).getUTCFullYear();
  redirect(`/parametros/${currentYear}`);
}
