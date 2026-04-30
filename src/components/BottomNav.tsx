import { useApp } from '../context/AppContext';
import type { View } from './Sidebar';

interface BottomNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onCreateTask: () => void;
}

export default function BottomNav({ currentView, onViewChange, onCreateTask }: BottomNavProps) {
  const { state } = useApp();
  const { currentUser, tasks } = state;
  if (!currentUser) return null;

  const isDirector = currentUser.role === 'director';
  const userColor = currentUser.color ?? '#BE185D';

  const incomingCount = tasks.filter(t =>
    t.transferredTo === currentUser.id && t.status === 'transferred'
  ).length;

  const items: { id: View | 'create'; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Главная', icon: '⌂' },
    { id: 'my-tasks', label: 'Задачи', icon: '◉' },
    { id: 'create', label: 'Создать', icon: '+' },
    { id: 'incoming', label: 'Входящие', icon: '↓', badge: incomingCount },
    { id: isDirector ? 'director-review' : 'settings', label: isDirector ? 'Проверка' : 'Ещё', icon: isDirector ? '◎' : '◌' },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        if (item.id === 'create') {
          return (
            <button
              key="create"
              onClick={onCreateTask}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: userColor,
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 22, fontWeight: 600, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 14px ${userColor}50`,
                transition: 'transform 0.15s',
                flexShrink: 0,
              }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
              onTouchEnd={e => { e.currentTarget.style.transform = ''; }}
            >
              +
            </button>
          );
        }
        const active = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '4px 0', border: 'none', background: 'transparent',
              cursor: 'pointer', position: 'relative',
              color: active ? userColor : '#C0BDB9',
              transition: 'color 0.12s',
              fontFamily: 'var(--font)',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, letterSpacing: '0.1px' }}>
              {item.label}
            </span>
            {item.badge !== undefined && item.badge > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: '50%', transform: 'translateX(14px)',
                background: '#3B82F6', color: '#fff',
                borderRadius: 100, fontSize: 9, fontWeight: 700,
                padding: '1px 4px', minWidth: 14, textAlign: 'center',
              }}>
                {item.badge}
              </span>
            )}
            {active && (
              <span style={{
                position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                width: 3, height: 3, borderRadius: '50%', background: userColor,
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
