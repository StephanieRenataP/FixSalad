'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChart, IconReceipt, IconSliders, IconUtensils } from './icons';
import { Logo } from './Logo';
import { CONTAINER } from './PageShell';

// Satu daftar route, dua tampilan: bar bawah (<768px) dan header atas (>=768px).
const ROUTES = [
  { label: 'Menu', href: '/', Icon: IconUtensils },
  { label: 'Rakit', href: '/preferensi', Icon: IconSliders },
  { label: 'Pesanan', href: '/pesanan', Icon: IconReceipt },
  { label: 'Nutrisi', href: '/nutrisi', Icon: IconChart },
];

// Screen order flow masuk ke "Rakit".
const FLOW = ['/preferensi', '/rekomendasi', '/ubah', '/checkout', '/sukses'];

// Bar bawah hanya di halaman non-flow; di order flow ia menutupi CTA.
const BOTTOM_BAR_PAGES = ['/', '/pesanan', '/nutrisi'];

function isActive(href: string, pathname: string): boolean {
  if (href === '/preferensi') return FLOW.includes(pathname);
  return pathname === href;
}

export function SiteNav() {
  const pathname = usePathname() ?? '/';

  return (
    <>
      <header className="sticky top-0 z-30 hidden h-16 border-b border-gray-200 bg-cream-50/95 backdrop-blur md:block">
        <div className={`flex h-full items-center justify-between ${CONTAINER}`}>
          <Link href="/" aria-label="Fix Salad — beranda">
            <Logo />
          </Link>
          <nav aria-label="Navigasi utama">
            <ul className="flex items-center gap-1">
              {ROUTES.map(({ label, href }) => {
                const active = isActive(href, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`rounded-full px-4 py-2 text-[15px] transition-colors hover:bg-green-100 ${
                        active ? 'font-bold text-green-900' : 'font-medium text-gray-600'
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      {BOTTOM_BAR_PAGES.includes(pathname) && (
        <nav
          aria-label="Navigasi utama"
          className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-app border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="grid grid-cols-4">
            {ROUTES.map(({ label, href, Icon }) => {
              const active = isActive(href, pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full flex-col items-center gap-1 py-3 text-[13px] ${
                      active ? 'font-bold text-green-900' : 'font-medium text-gray-600'
                    }`}
                  >
                    <Icon size={22} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
