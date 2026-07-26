import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { clearAuth, getAuthUser } from '@/api/auth/auth';
import Sidebar from '@/components/customer/template/Sidebar';
import Topbar from '@/components/customer/template/Topbar';

export default function CustomerAppLayout() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`guru-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <Topbar
        user={user}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
      />
      <div className="guru-body">
        <Sidebar isOpen={sidebarOpen} />
        <main className="guru-main-area">
          <section className="guru-content-area">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
