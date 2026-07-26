import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Settings, Sprout, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AuthUser } from '@/types';
import { API_BASE } from '@/api/context/apiClient';

interface Props {
  user: AuthUser | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

function formatTopbarDate() {
  const date = new Date();

  const weekday = date.toLocaleDateString('en-US', {
    weekday: 'long',
  });

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);

  return `${weekday}, ${month}.${day}.${year}`;
}

function avatarUrl(avatar?: string | null) {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  if (avatar.startsWith('/')) return `${API_BASE}${avatar}`;
  return avatar;
}

function getDisplayName(user: AuthUser | null) {
  return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Admin';
}

export default function Topbar({ user, onLogout, onToggleSidebar }: Props) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const fullName = getDisplayName(user);
  const currentDate = useMemo(() => formatTopbarDate(), []);
  const userAvatar = avatarUrl(user?.avatar);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationsOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="guru-topbar">
      <div className="guru-topbar-left">
        <button className="guru-icon-button" type="button" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Menu size={22} />
        </button>
        
        <Link to="/admin/dashboard" className="guru-logo" aria-label="Admin dashboard">
          <span className="guru-logo-blue">Bot</span>
          <span className="guru-logo-green">&nbsp;Admin</span>
        </Link>
      </div>

      <div className="guru-topbar-date">{currentDate}</div>

      <div className="guru-topbar-actions">
        <button className="guru-icon-button sun" type="button" aria-label="Theme">
          <Sun size={25} />
        </button>

        <div className="guru-popup-wrap" ref={notificationRef}>
          <button
            className="guru-icon-button notification"
            type="button"
            onClick={() => setNotificationsOpen((value) => !value)}
            aria-label="Notifications"
          >
            <Bell size={21} />
            <span>4</span>
          </button>

          {notificationsOpen && (
            <div className="guru-dropdown guru-notification-dropdown">
              <div className="guru-dropdown-header">
                <strong>Notifications</strong>
                <small>Admin alerts</small>
              </div>
              <div className="guru-notification-item">
                <strong>Server uptime</strong>
                <span>System health check is ready.</span>
              </div>
              <div className="guru-notification-item">
                <strong>User usage</strong>
                <span>Token usage report needs review.</span>
              </div>
              <div className="guru-notification-item">
                <strong>Security</strong>
                <span>No critical issues detected.</span>
              </div>
            </div>
          )}
        </div>

        <div className="guru-popup-wrap" ref={profileRef}>
          <button
            className="guru-avatar-button"
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            aria-label="User menu"
          >
            {userAvatar ? (
              <img className="guru-avatar-img" src={userAvatar} alt={fullName} />
            ) : (
              <Sprout size={21} />
            )}
            <ChevronDown size={14} />
          </button>

          {profileOpen && (
            <div className="guru-dropdown guru-profile-dropdown">
              <div className="guru-profile-head">
                <div className="guru-avatar-circle">
                  {userAvatar ? (
                    <img className="guru-avatar-img" src={userAvatar} alt={fullName} />
                  ) : (
                    <Sprout size={21} />
                  )}
                </div>

                <div>
                  <strong>{fullName}</strong>
                </div>
              </div>

              <Link to="/admin/profile" onClick={() => setProfileOpen(false)}>
                <Settings size={16} />
                Settings
              </Link>

              <Link to="/admin/profile" onClick={() => setProfileOpen(false)}>
                <KeyRound size={16} />
                Change Password
              </Link>

              <button type="button" onClick={onLogout}>
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
