import { IconUser } from './icons';

export function ProfileButton() {
  return (
    <button
      type="button"
      aria-label="Profil"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-900 text-white"
    >
      <IconUser size={20} />
    </button>
  );
}
