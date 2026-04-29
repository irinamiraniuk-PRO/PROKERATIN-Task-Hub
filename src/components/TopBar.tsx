
import { useApp } from '../context/AppContext';

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
  const { currentUser } = state;

  if (!currentUser) return null;

  const color = currentUser.color ?? '#BE185D';
  const initials = currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const isDirector = currentUser.role === 'director';

  return (
    <header style={{
      height: 60,
      background: '#fff',
      borderBottom: '1px solid #EBEBEB',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#bbb' }}>
          🔍
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Поиск задач..."
          style={{
            width: '100%',
            padding: '8px 12px 8px 32px',
            border: '1.5px solid #E8E8E8',
            borderRadius: 9,
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            background: '#FAFAF8',
            color: '#333',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = color)}
          onBlur={e => (e.target.style.borderColor = '#E8E8E8')}
        />
      </div>

      {/* Greeting */}
      <div style={{ fontSize: 13, color: '#888', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
        {getGreeting(currentUser.name)}
      </div>

      <div style={{ flex: 1 }} />

      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{currentUser.name}</div>
          <div style={{ fontSize: 10, color: isDirector ? color : '#999', fontWeight: isDirector ? 700 : 500 }}>
            {isDirector ? '👑 Директор' : 'Сотрудник'}
          </div>
        </div>

        {/* Avatar */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 13,
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: `0 2px 8px ${color}50`,
        }}>
          {initials}
        </div>

        <button
          onClick={logout}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: '1.5px solid #E8E8E8',
            cursor: 'pointer',
            background: '#fff',
            fontSize: 12,
            color: '#666',
            fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#FEF2F2';
            e.currentTarget.style.borderColor = '#FECACA';
            e.currentTarget.style.color = '#B91C1C';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.borderColor = '#E8E8E8';
            e.currentTarget.style.color = '#666';
          }}
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
