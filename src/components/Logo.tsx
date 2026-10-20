/** Logo FixSalad: daun dalam kotak bulat hijau (SVG inline, SPEC.md §6.5). */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <rect width="40" height="40" rx="11" fill="var(--green-900)" />
      <path
        d="M19 28.5a8 8 0 0 1-1.4-15.9c6.5-1.2 8.2-1.8 10.5-4.6 1.1 2.3 2.3 4.8 2.3 9.1 0 6.3-5.5 11.4-11.4 11.4Z"
        fill="none"
        stroke="var(--lime-300)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 30c0-3.4 2.1-6.1 5.8-6.8 2.7-.6 5.6-2.3 6.7-3.5"
        fill="none"
        stroke="var(--lime-300)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={44} />
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
