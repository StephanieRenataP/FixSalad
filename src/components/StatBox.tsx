import type { ReactNode } from 'react';

type Props = { label: string; value: ReactNode; tone?: 'default' | 'price' };

/** Label kecil di atas, angka besar di bawah. */
export function StatBox({ label, value, tone = 'default' }: Props) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl bg-cream-50 px-2 py-3 text-center">
      <span className="text-[12px] font-medium text-gray-600">{label}</span>
      <span
        className={`mt-0.5 text-[18px] font-bold leading-tight ${tone === 'price' ? 'text-rust-600' : 'text-green-900'}`}
      >
        {value}
      </span>
    </div>
  );
}
