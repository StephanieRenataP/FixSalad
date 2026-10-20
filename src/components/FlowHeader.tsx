'use client';

import { useRouter } from 'next/navigation';
import { IconArrowLeft } from './icons';
import { LogoMark } from './Logo';
import { ProfileButton } from './ProfileButton';
import { Stepper } from './Stepper';

type Props = { title: string; step: 1 | 2 | 3 | 4; backHref: string };

/** Header sticky untuk screen order flow: kembali + logo + judul + stepper. */
export function FlowHeader({ title, step, backHref }: Props) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 bg-cream-50/95 px-4 pb-3 pt-3 shadow-card backdrop-blur">
      <div className="mb-2.5 flex items-center gap-2">
        <button
          type="button"
          aria-label="Kembali"
          onClick={() => router.push(backHref)}
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-green-900 hover:bg-green-100"
        >
          <IconArrowLeft size={24} />
        </button>
        <LogoMark size={30} />
        <h1 className="min-w-0 flex-1 truncate text-[18px] font-bold text-green-900">Order Flow {title}</h1>
        <ProfileButton />
      </div>
      <Stepper current={step} />
    </header>
  );
}
