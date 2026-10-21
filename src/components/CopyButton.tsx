'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconClipboard } from './icons';

/**
 * Tombol "Salin" (SPEC.md §7.5). Clipboard API tidak ada di konteks non-HTTPS —
 * kalau begitu tombol disembunyikan dan teks di sebelahnya tetap bisa diblok manual.
 * Gagal menyalin tidak pernah menampilkan error.
 */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [available, setAvailable] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Cek di effect, bukan saat render — server tidak punya navigator (hydration mismatch).
  useEffect(() => {
    setAvailable(typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText);
    return () => clearTimeout(timer.current);
  }, []);

  async function salin() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // izin ditolak / konteks tidak aman — nomor tetap bisa disalin manual
    }
  }

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={salin}
      aria-label={copied ? 'Tersalin' : `Salin ${label}`}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition-colors ${
        copied ? 'bg-lime-300 text-green-900' : 'bg-green-900 text-white hover:bg-green-700'
      }`}
    >
      {copied ? <IconCheck size={16} strokeWidth={3} /> : <IconClipboard size={16} />}
      <span aria-live="polite">{copied ? 'Tersalin!' : 'Salin'}</span>
    </button>
  );
}
