import { Fragment } from 'react';
import { IconCheck, IconChevronRight } from './icons';

const STEPS = ['Preferensi', 'Rekomendasi', 'Ubah', 'Bayar'] as const;

/** Stepper 4 langkah order flow. `current` = 1..4. */
export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex items-center justify-between gap-1 text-[12px] font-semibold" aria-label="Langkah pemesanan">
      {STEPS.map((label, idx) => {
        const n = idx + 1;
        const state = n < current ? 'done' : n === current ? 'active' : 'todo';
        return (
          <Fragment key={label}>
            {idx > 0 && <IconChevronRight size={12} className="shrink-0 text-gray-600/60" />}
            <li
              aria-current={state === 'active' ? 'step' : undefined}
              className={`flex min-w-0 items-center gap-1 whitespace-nowrap ${
                state === 'todo' ? 'text-gray-600' : 'text-green-900'
              }`}
            >
              <span
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] ${
                  state === 'active'
                    ? 'bg-green-900 text-white'
                    : state === 'done'
                      ? 'bg-lime-300 text-green-900'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {state === 'done' ? <IconCheck size={11} strokeWidth={3} /> : n}
              </span>
              <span className={state === 'active' ? 'font-bold' : ''}>{label}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
