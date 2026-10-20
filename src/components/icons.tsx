// Ikon SVG inline (stroke, 24×24). Tidak pakai library ikon — semua lokal.
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: ReactNode) {
  return function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const IconLeaf = make(
  <>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </>,
);
export const IconUser = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </>,
);
export const IconArrowLeft = make(<path d="m15 18-6-6 6-6" />);
export const IconArrowRight = make(
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>,
);
export const IconChevronRight = make(<path d="m9 18 6-6-6-6" />);
export const IconSparkle = make(
  <>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </>,
);
export const IconCheck = make(<path d="M20 6 9 17l-5-5" />);
export const IconX = make(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);
export const IconCheckCircle = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </>,
);
export const IconBadgeCheck = make(
  <>
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);
export const IconFlame = make(
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
);
export const IconCart = make(
  <>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
  </>,
);
export const IconBag = make(
  <>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </>,
);
export const IconSliders = make(
  <>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </>,
);
export const IconShuffle = make(
  <>
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
    <path d="m18 14 4 4-4 4" />
  </>,
);
export const IconAlert = make(
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
);
export const IconInfo = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </>,
);
export const IconBolt = make(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />);
export const IconUtensils = make(
  <>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </>,
);
export const IconReceipt = make(
  <>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </>,
);
export const IconChart = make(
  <>
    <path d="M3 3v18h18" />
    <path d="M7 16v-3M11 16V9M15 16v-5M19 16V6" />
  </>,
);
export const IconStore = make(
  <>
    <path d="M3 9 4.5 4h15L21 9" />
    <path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
    <path d="M5 13v8h14v-8" />
  </>,
);
export const IconScooter = make(
  <>
    <circle cx="6" cy="17" r="3" />
    <circle cx="18" cy="17" r="3" />
    <path d="M9 17h6l-2-8h3M13 9V6h-2" />
  </>,
);
export const IconQr = make(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
  </>,
);
export const IconWallet = make(
  <>
    <rect x="2" y="5" width="20" height="15" rx="2" />
    <path d="M16 12h2M2 9h20" />
  </>,
);
export const IconBank = make(
  <>
    <path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10" />
    <path d="m2 10 10-6 10 6Z" />
  </>,
);
export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
);
export const IconLock = make(
  <>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
);
export const IconSprout = make(
  <>
    <path d="M12 22V11" />
    <path d="M12 11C12 7 9 4 4 4c0 4 3 7 8 7Z" />
    <path d="M12 13c0-3 2.5-6 8-6 0 3.5-3 6-8 6Z" />
  </>,
);
export const IconMeat = make(
  <>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <path d="M7 10h10M7 14h6" />
  </>,
);
export const IconCherry = make(
  <>
    <circle cx="12" cy="15" r="6" />
    <path d="M12 9V4l3-2" />
  </>,
);
export const IconDroplet = make(<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />);
export const IconMinus = make(<path d="M5 12h14" />);
export const IconPlus = make(
  <>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </>,
);
export const IconClipboard = make(
  <>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="m8 10 2 2 4-4M8 16h8" />
  </>,
);
export const IconBrain = make(
  <>
    <circle cx="12" cy="10" r="7" />
    <path d="M9 21h6M12 17v4M9 10h.01M12 7v6M15 10h.01" />
  </>,
);
export const IconWand = make(
  <>
    <path d="m15 4 5 5L8 21l-5-5Z" />
    <path d="M18 2v2M22 6h-2M14 2l1 1" />
  </>,
);
