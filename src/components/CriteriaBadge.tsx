import type { ReactNode } from 'react';
import { IconCheck, IconX } from './icons';

/** ✓ + teks. Lime jika terpenuhi, rust jika gagal. */
export function CriteriaBadge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
        ok ? 'bg-lime-300 text-green-900' : 'bg-rust-100 text-rust-600'
      }`}
    >
      {ok ? <IconCheck size={14} strokeWidth={3} /> : <IconX size={14} strokeWidth={3} />}
      {children}
    </span>
  );
}
