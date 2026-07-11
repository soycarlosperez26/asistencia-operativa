import Image from "next/image";
import { COMPANY_LOGO, COMPANY_NAME } from "@/lib/config";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={COMPANY_LOGO}
      alt={COMPANY_NAME}
      width={160}
      height={160}
      className={className}
      priority
    />
  );
}
