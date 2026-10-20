import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  active?: boolean;
  children: ReactNode;
  size?: 'md' | 'sm';
};

/** Pill selectable. Aktif = bg green-900 + teks putih. */
export function Chip({ active = false, children, size = 'md', className = '', ...props }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        size === 'md' ? 'px-[18px] py-[10px] text-[15px]' : 'px-3.5 py-2 text-[13px]'
      } ${active ? 'bg-green-900 text-white' : 'bg-green-100 text-green-900 hover:brightness-95'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
