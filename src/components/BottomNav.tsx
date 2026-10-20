import { IconChart, IconReceipt, IconSliders, IconUtensils } from './icons';

const ITEMS = [
  { label: 'Menu', Icon: IconUtensils },
  { label: 'Rakit', Icon: IconSliders },
  { label: 'Pesanan', Icon: IconReceipt },
  { label: 'Nutrisi', Icon: IconChart },
];

/** Bottom nav — visual saja untuk prototype (SPEC.md §7.1). */
export function BottomNav({ active = 'Menu' }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-app border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ label, Icon }) => {
          const isActive = label === active;
          return (
            <li key={label}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 py-3 text-[13px] ${
                  isActive ? 'font-bold text-green-900' : 'font-medium text-gray-600'
                }`}
              >
                <Icon size={22} />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
