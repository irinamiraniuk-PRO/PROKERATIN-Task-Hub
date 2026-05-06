import { useApp } from '../context/AppContext';
import type { View } from './Sidebar';

const GOLD = '#C9A84C';
const GOLD_BG = 'rgba(201,168,76,0.12)';
const CREATE_BUTTON_SHADOW = '0 4px 18px rgba(201,168,76,0.4), 0 0 0 1px rgba(201,168,76,0.2)';

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

  const incomingCount = tasks.filter(t =>
    t.transferredTo === currentUser.id && t.status === 'transferred'
  ).length;

  const items: { id: View | 'create'; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard',  label: 'Главная',  icon: '⌂' },
    { id: 'my-tasks',   label: 'Задачи',   icon: '◉' },
    { id: 'create',     label: 'Создать',  icon: '+' },
    { id: 'incoming',   label: 'Входящие', icon: '↓', badge: incomingCount },
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
                width: 46, height: 46, borderRadius: '50%',
                background: `linear-gradient(135deg, ${GOLD}, #A8882C)`,
                color: '#0A0A0A', border: 'none', cursor: 'pointer',
                fontSize: 22, fontWeight: 700, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: CREATE_BUTTON_SHADOW,
                transition: 'transform 0.15s, box-shadow 0.15s',
                flexShrink: 0,
              }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.92)'; e.currentTarget.style.boxShadow = `0 2px 10px rgba(201,168,76,0.3)`; }}
              onTouchEnd={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = CREATE_BUTTON_SHADOW; }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
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
              gap: 3, padding: '4px 0', border: 'none',
              background: active ? GOLD_BG : 'transparent',
              cursor: 'pointer', position: 'relative',
              color: active ? GOLD : 'rgba(160,150,130,0.7)',
              transition: 'color 0.12s, background 0.12s',
              borderRadius: 10,
              margin: '0 2px',
              fontFamily: 'var(--font)',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, letterSpacing: '0.1px' }}>
              {item.label}
            </span>
            {item.badge !== undefined && item.badge > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: '50%', transform: 'translateX(14px)',
                background: GOLD, color: '#0A0A0A',
                borderRadius: 100, fontSize: 9, fontWeight: 800,
                padding: '1px 4px', minWidth: 14, textAlign: 'center',
                lineHeight: '13px',
              }}>
                {item.badge}
              </span>
            )}
            {active && (
              <span style={{
                position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
                width: 16, height: 2, borderRadius: 1,
                background: `linear-gradient(90deg, ${GOLD}80, ${GOLD}, ${GOLD}80)`,
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
