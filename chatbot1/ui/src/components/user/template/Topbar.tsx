import { LogOut, Sprout } from 'lucide-react';
import type { AuthUser } from '@/types';
import { API_BASE } from '@/api/context/apiClient';

interface Props {
  user: AuthUser | null;
  onLogout: () => void;
}

function avatarUrl(avatar?: string | null) {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  if (avatar.startsWith('/')) return `${API_BASE}${avatar}`;
  return avatar;
}

function getDisplayName(user: AuthUser | null) {
  return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Unknown user';
}

export default function Topbar({ user, onLogout }: Props) {
  const fullName = getDisplayName(user);
  const userAvatar = avatarUrl(user?.avatar);

  return (
    <header className="flex min-h-20 flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-7">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-slate-600">
          {userAvatar ? (
            <img className="h-full w-full object-cover" src={userAvatar} alt={fullName} />
          ) : (
            <Sprout size={20} />
          )}
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Logged in as</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{fullName}</h2>
        </div>
      </div>

      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
        onClick={onLogout}
      >
        <LogOut size={18} />
        Logout
      </button>
    </header>
  );
}
