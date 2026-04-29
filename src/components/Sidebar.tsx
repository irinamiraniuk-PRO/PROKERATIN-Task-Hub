
import { useApp } from '../context/AppContext';

type View = 'dashboard' | 'my-tasks' | 'incoming' | 'outgoing' | 'archive' | 'director';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onCreateTask: () => void;
}

export default function Sidebar({ currentView, onViewChange, onCreateTask }: SidebarProps) {
  const { state } = useApp();
  const { currentUser, tasks } = state;

  if (!currentUser) return null;

  const isDirector = currentUser.role === 'director';

  const incomingCount = tasks.filter(t =>
    t.transferredTo === currentUser.id && t.status === 'transferred'
  ).length;

  const reviewCount = tasks.filter(t => t.status === 'pending_director_review').length;

  const navItems: { id: View; label: string; icon: string; badge?: number; directorOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Дашборд', icon: '📊' },
    { id: 'my-tasks', label: 'Мои задачи', icon: '📋' },
    { id: 'incoming', label: 'Входящие', icon: '📥', badge: incomingCount },
    { id: 'outgoing', label: 'Исходящие', icon: '📤' },
    { id: 'archive', label: 'Архив', icon: '🗂️' },
    { id: 'director', label: 'Команда', icon: '👥', badge: isDirector ? reviewCount : undefined, directorOnly: true },
  ];

  const visibleItems = navItems.filter(item => !item.directorOnly || isDirector);

  return (
    <aside style={{
      width: 220, flexShrink: 0, background: '#fff', borderRight: '1px solid #EBEBEB',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px', borderBottom: '1px solid #F0F0F0',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>PROKERATIN</div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>Task Hub</div>
      </div>

      {/* Create button */}
      <div style={{ padding: '16px 16px 12px' }}>
        <button
          onClick={onCreateTask}
          style={{
            width: '100%', padding: '10px', background: '#4A90D9', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#357ABD')}
          onMouseLeave={e => (e.currentTarget.style.background = '#4A90D9')}
        >
          <span style={{ fontSize: 16 }}>+</span> Новая задача
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
        {visibleItems.map(item => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 9, border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 2, textAlign: 'left',
                background: active ? '#EEF4FB' : 'transparent',
                color: active ? '#2563EB' : '#444',
                fontWeight: active ? 600 : 400, fontSize: 13,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F5F5F5'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{
                  background: '#EF4444', color: '#fff', borderRadius: 10,
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom branding */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #F0F0F0', fontSize: 10, color: '#ccc' }}>
        v1.0.0
      </div>
    </aside>
  );
}
