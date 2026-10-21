import Image from 'next/image';

/** Logo FixSalad dari public/FixSalad_Logo.png (persegi 1:1, SPEC.md §6.5). */
export function LogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/FixSalad_Logo.png"
      alt=""
      width={size}
      height={size}
      priority
      className={`shrink-0 rounded-lg object-contain ${className}`}
    />
  );
}

/** Logo + nama. Mobile 32 px, >=768px (top nav) 36 px. */
export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={36} className="h-8 w-8 md:h-9 md:w-9" />
      <div className="leading-none">
        <div className="text-[20px] font-bold tracking-tight text-green-900">Fix Salad</div>
        <div className="mt-0.5 text-[12px] leading-[1.15] text-gray-600">
          Organic
          <br />
          Kitchen
        </div>
      </div>
    </div>
  );
}
