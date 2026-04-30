
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import NotificationsPanel from './NotificationsPanel';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(' ')[0];
  if (hour < 12) return `Доброе утро, ${firstName} ☀️`;
  if (hour < 17) return `Добрый день, ${firstName} 👋`;
  return `Добрый вечер, ${firstName} 🌙`;
}

export default function TopBar({ searchQuery, onSearchChange }: TopBarProps) {
  const { state, logout } = useApp();
  const { currentUser, notifications } = state;
  const [showNotifications, setShowNotifications] = useState(false);

  if (!currentUser) return null;

  const color = currentUser.color ?? '#BE185D';
  const initials = currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const isDirector = currentUser.role === 'director';
  const unreadCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;

  return (
    <header style={{
      height: 56,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #EEECEA',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 12,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 380, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#C0BDB9', pointerEvents: 'none' }}>
          ⌕
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Поиск задач..."
          style={{
            width: '100%',
            padding: '7px 12px 7px 30px',
            border: '1.5px solid #EEECEA',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            background: '#F7F7F5',
            color: '#1A1A1A',
            transition: 'border-color 0.15s, background 0.15s',
            fontFamily: 'var(--font)',
          }}
          onFocus={e => { e.target.style.borderColor = color; e.target.style.background = '#fff'; }}
          onBlur={e => { e.target.style.borderColor = '#EEECEA'; e.target.style.background = '#F7F7F5'; }}
        />
      </div>

      {/* Greeting */}
      <div className="topbar-greeting" style={{ fontSize: 13, color: '#ADADAD', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
        {getGreeting(currentUser.name)}
      </div>

      <div style={{ flex: 1 }} />

      {/* Notifications bell */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowNotifications(v => !v)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: showNotifications ? `1.5px solid ${color}` : '1.5px solid #EEECEA',
            background: showNotifications ? `${color}0F` : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            position: 'relative',
            transition: 'all 0.12s',
            flexShrink: 0,
            color: '#6B6B6B',
          }}
          title="Уведомления"
          onMouseEnter={e => { if (!showNotifications) { e.currentTarget.style.background = '#F7F7F5'; e.currentTarget.style.borderColor = '#DEDAD6'; } }}
          onMouseLeave={e => { if (!showNotifications) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#EEECEA'; } }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -3,
              right: -3,
              background: color,
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 100,
              padding: '1px 4px',
              minWidth: 14,
              textAlign: 'center',
              border: '1.5px solid #fff',
              lineHeight: '12px',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <NotificationsPanel onClose={() => setShowNotifications(false)} />
        )}
      </div>

      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'right' }}>
          <div className="topbar-user-name" style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.1px' }}>{currentUser.name}</div>
          <div style={{ fontSize: 10, color: isDirector ? color : '#ADADAD', fontWeight: isDirector ? 600 : 400 }}>
            {isDirector ? '👑 Директор' : 'Сотрудник'}
          </div>
        </div>

        {/* Avatar */}
        <div style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}AA)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: `0 2px 8px ${color}40`,
        }}>
          {initials}
        </div>

        <button
          onClick={logout}
          style={{
            padding: '6px 12px',
            borderRadius: 7,
            border: '1.5px solid #EEECEA',
            cursor: 'pointer',
            background: 'transparent',
            fontSize: 12,
            color: '#6B6B6B',
            fontWeight: 500,
            transition: 'all 0.12s',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#FEF2F2';
            e.currentTarget.style.borderColor = '#FECACA';
            e.currentTarget.style.color = '#EF4444';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#EEECEA';
            e.currentTarget.style.color = '#6B6B6B';
          }}
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
