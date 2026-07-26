import { NavLink } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  ChevronDown,
  Clock,
  Folder,
  Headphones,
  Lock,
  Settings,
  Users,
  Images,
  LayoutDashboard,
  UserCircle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
}


export default function Sidebar({ isOpen }: Props) {
  return (
    <aside className={`guru-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="guru-sidebar-tools">
        <button type="button" aria-label="Back">‹</button>
        <button type="button" aria-label="Search">⌕</button>
      </div>

      <div className="guru-folder-list">
        <NavLink to="/admin/dashboard" className="guru-folder-item">
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/admin/users" className="guru-folder-item">
          <Users size={16} />
          <span>Users</span>
        </NavLink>
        <NavLink to="/admin/profile" className="guru-folder-item">
          <UserCircle size={16} />
          <span>Profile</span>
        </NavLink>
        <NavLink to="/admin/media" className="guru-folder-item">
          <Images size={16} />
          <span>Media</span>
        </NavLink>
        <NavLink to="/admin/resources" className="guru-folder-item">
          <BookOpen size={16} />
          <span>Resources</span>
        </NavLink>
      </div>

    </aside>
  );
}
