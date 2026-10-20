import { IconMinus, IconPlus } from './icons';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string; // untuk aria-label
};

/** − angka + */
export function Counter({ value, onChange, min = 0, max = 99, label }: Props) {
  const btn =
    'flex h-10 w-10 items-center justify-center rounded-full bg-cream-50 text-green-900 transition-colors hover:bg-green-100 disabled:opacity-40 disabled:hover:bg-cream-50';
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        aria-label={`Kurangi ${label}`}
        className={btn}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <IconMinus size={18} />
      </button>
      <span className="w-7 text-center text-[16px] font-bold tabular-nums text-green-900" aria-live="polite">
        {value > 0 ? `+${value}` : value}
      </span>
      <button
        type="button"
        aria-label={`Tambah ${label}`}
        className={btn}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <IconPlus size={18} />
      </button>
    </div>
  );
}
