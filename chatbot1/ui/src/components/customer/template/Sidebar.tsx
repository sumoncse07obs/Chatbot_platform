import { NavLink } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  ChevronDown,
  Clock,
  Folder,
  Headphones,
  KeyRound,
  Lock,
  Settings,
  Users,
  Images,
  LayoutDashboard,
  UserCircle,
  UserRound,
  Bot,
  Pin,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
}


export default function Sidebar({ isOpen }: Props) {
  return (
    <aside className={`guru-sidebar customer-guru-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="guru-sidebar-tools">
        <button type="button" aria-label="Back">‹</button>
        <button type="button" aria-label="Search">⌕</button>
      </div>

      <div className="guru-folder-list">   
        <NavLink to="/customer/dashboard" className="guru-folder-item">
          <Bot size={16} />
          <span>Dashboard</span>
        </NavLink> 
        <NavLink to="/customer/profile" className="guru-folder-item">
          <UserRound size={16} />
          <span>Profile</span>
        </NavLink>
        <NavLink to="/customer/media" className="guru-folder-item">
          <Images size={16} />
          <span>Media</span>
        </NavLink>
        <NavLink to="/customer/resources" className="guru-folder-item">
          <BookOpen size={16} />
          <span>Resources</span>
        </NavLink>
        <NavLink to="/customer/apikeys" className="guru-folder-item">
          <KeyRound size={16} />
          <span>API Keys</span>
        </NavLink>
        <NavLink to="/customer/widget-install" className="guru-folder-item">
          <Pin size={16} />
          <span>Widget Install</span>
        </NavLink>
        <NavLink to="/customer/history" className="guru-folder-item">
          <Clock size={16} />
          <span>History</span>
        </NavLink>
      </div>
    </aside>
  );
}
