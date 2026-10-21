'use client';

import { useRouter } from 'next/navigation';
import { IconArrowLeft } from './icons';
import { LogoMark } from './Logo';
import { CONTAINER } from './PageShell';
import { Stepper } from './Stepper';

type Props = { title: string; step: 1 | 2 | 3 | 4; backHref: string };

/**
 * Sub-header order flow: kembali + judul + stepper.
 * Mobile: sticky di atas, dengan logo. >=768px: logo & nav ada di <SiteNav>,
 * jadi ini jadi baris statis yang sejajar dengan container halaman.
 */
export function FlowHeader({ title, step, backHref }: Props) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 bg-cream-50/95 px-4 pb-3 pt-3 shadow-card backdrop-blur md:static md:bg-transparent md:px-0 md:pb-0 md:pt-6 md:shadow-none md:backdrop-blur-none">
      <div className={CONTAINER}>
        <div className="mb-2.5 flex min-h-11 items-center gap-2">
          <button
            type="button"
            aria-label="Kembali"
            onClick={() => router.push(backHref)}
            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-green-900 hover:bg-green-100"
          >
            <IconArrowLeft size={24} />
          </button>
          <span className="flex shrink-0 md:hidden">
            <LogoMark size={32} />
          </span>
          <h1 className="min-w-0 flex-1 truncate text-[18px] font-bold text-green-900 lg:text-[20px]">
            Order Flow {title}
          </h1>
        </div>
        <div className="md:max-w-[560px]">
          <Stepper current={step} />
        </div>
      </div>
    </header>
  );
}
