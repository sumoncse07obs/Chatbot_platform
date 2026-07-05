import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserRound,Images } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/user/dashboard', icon: LayoutDashboard },
  { label: 'Profile', path: '/user/profile', icon: UserRound },
  { label: 'Media', path: '/user/media', icon: Images },
];

export default function Sidebar() {
  return (
    <aside className="border-r border-slate-200 bg-white p-5 lg:sticky lg:top-0 lg:h-screen">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white">
          B
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-950">User Panel</h1>
          <p className="text-sm text-slate-500">Member workspace</p>
        </div>
      </div>

      <nav className="mt-5 grid gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-10 grid gap-1 text-sm text-slate-500">
        <span className="font-extrabold text-slate-950">BotAPI</span>
        <small>React + FastAPI</small>
      </div>
    </aside>
  );
}
