import Image from "next/image";
import Link from "next/link";

export function Brand({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return <Link href="/" className={`digol-brand ${className}`} aria-label="Digol TravelOS home">
    <Image src="/digol-mark.svg" width={42} height={42} alt="" priority />
    {!compact && <span><strong>Digol <em>TravelOS</em></strong><small>BY DIGOL TOURS</small></span>}
  </Link>;
}
