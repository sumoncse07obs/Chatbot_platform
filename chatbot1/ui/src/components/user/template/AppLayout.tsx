import { Outlet, useNavigate } from 'react-router-dom';
import { clearAuth, getAuthUser } from '@/api/auth/auth';
import Sidebar from '@/components/user/template/Sidebar';
import Topbar from '@/components/user/template/Topbar';

export default function UserAppLayout() {
  const navigate = useNavigate();
  const user = getAuthUser();

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar />
      <main className="min-w-0">
        <Topbar user={user} onLogout={handleLogout} />
        <section className="p-5 lg:p-7">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
