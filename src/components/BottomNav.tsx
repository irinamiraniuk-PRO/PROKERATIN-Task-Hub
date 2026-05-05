import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { View } from './Sidebar';

interface BottomNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onCreateTask: () => void;
}

export default function BottomNav({ currentView, onViewChange, onCreateTask }: BottomNavProps) {
  const { state, logout } = useApp();
  const { currentUser, tasks } = state;
  const [showMenu, setShowMenu] = useState(false);

  if (!currentUser) return null;

  const isDirector = currentUser.role === 'director';
  const userColor = currentUser.color ?? '#BE185D';
  const userInitials = currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const incomingCount = tasks.filter(t =>
    t.transferredTo === currentUser.id && t.status === 'transferred'
  ).length;

  const returnedCount = tasks.filter(t =>
    t.assignedTo === currentUser.id && t.status === 'returned_for_revision'
  ).length;

  const waitingCount = tasks.filter(t =>
    t.assignedTo === currentUser.id && t.status === 'waiting_response'
  ).length;

  const pendingMineCount = tasks.filter(t =>
    t.assignedTo === currentUser.id && t.status === 'pending_director_review'
  ).length;

  const reviewCount = tasks.filter(t => t.status === 'pending_director_review').length;

  function navigate(view: View) {
    onViewChange(view);
    setShowMenu(false);
  }

  /* Main bottom bar items (5 slots) */
  const mainItems: { id: View; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Главная', icon: '⌂' },
    { id: 'my-tasks', label: 'Задачи', icon: '◉', badge: returnedCount > 0 ? returnedCount : undefined },
    { id: 'incoming', label: 'Входящие', icon: '↓', badge: incomingCount },
    { id: isDirector ? 'director-review' : 'pending-director', label: isDirector ? 'Проверка' : 'На пров.', icon: '◎', badge: isDirector ? reviewCount : pendingMineCount },
  ];

  /* All nav items for the menu sheet */
  interface MenuGroup { title: string; items: { id: View; label: string; icon: string; badge?: number; badgeColor?: string }[] }
  const menuGroups: MenuGroup[] = [
    {
      title: 'Главное',
      items: [
        { id: 'dashboard', label: 'Главная', icon: '⌂' },
        { id: 'calendar-planner', label: 'Дашборд', icon: '▦' },
      ],
    },
    {
      title: 'Планирование',
      items: [
        { id: 'week-planner', label: 'Планер недели', icon: '◫' },
        { id: 'kanban', label: 'Канбан-доска', icon: '▤' },
      ],
    },
    {
      title: 'Задачи',
      items: [
        { id: 'my-tasks', label: 'Мои задачи', icon: '◉', badge: returnedCount > 0 ? returnedCount : undefined, badgeColor: '#EF4444' },
        { id: 'incoming', label: 'Входящие', icon: '↓', badge: incomingCount, badgeColor: '#3B82F6' },
        { id: 'outgoing', label: 'Исходящие', icon: '↑' },
        ...(!isDirector ? [
          { id: 'waiting' as View, label: 'Жду ответ', icon: '◷', badge: waitingCount, badgeColor: '#F97316' },
          { id: 'pending-director' as View, label: 'На проверке', icon: '◎', badge: pendingMineCount, badgeColor: '#D97706' },
        ] : [
          { id: 'director-review' as View, label: 'На проверке', icon: '◎', badge: reviewCount, badgeColor: '#D97706' },
          { id: 'team' as View, label: 'Команда', icon: '◈' },
        ]),
      ],
    },
    {
      title: 'Управление',
      items: [
        { id: 'archive', label: 'Архив', icon: '▣' },
        { id: 'settings', label: 'Настройки', icon: '◌' },
        { id: 'knowledge-base', label: 'База знаний', icon: '◦' },
        { id: 'onboarding', label: 'Онбординг', icon: '◇' },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop for menu */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            zIndex: 'calc(var(--z-bottomnav) - 1)' as React.CSSProperties['zIndex'],
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Slide-up menu sheet */}
      {showMenu && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderRadius: '20px 20px 0 0',
          zIndex: 'calc(var(--z-bottomnav) + 10)' as React.CSSProperties['zIndex'],
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          padding: '0 0 env(safe-area-inset-bottom, 16px)',
          maxHeight: '80vh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease both',
        }}>
          {/* Handle + header */}
          <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid #F1F0EE', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DFDD', margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                  background: `linear-gradient(135deg, ${userColor}, ${userColor}99)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {currentUser.avatar
                    ? <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : userInitials
                  }
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{currentUser.name}</div>
                  <div style={{ fontSize: 11, color: isDirector ? userColor : '#ADADAD', fontWeight: isDirector ? 600 : 400 }}>
                    {isDirector ? '👑 Директор' : 'Сотрудник'}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                style={{
                  padding: '6px 12px', borderRadius: 7, border: '1.5px solid #EEECEA',
                  background: 'transparent', fontSize: 12, color: '#6B6B6B', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}
              >
                Выйти
              </button>
            </div>
          </div>

          {/* Nav groups */}
          <div style={{ padding: '8px 16px 16px' }}>
            {menuGroups.map(group => (
              <div key={group.title} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#C0BDB9', textTransform: 'uppercase', letterSpacing: '0.7px', padding: '8px 4px 4px' }}>
                  {group.title}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {group.items.map(item => {
                    const active = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        style={{
                          padding: '10px 12px', borderRadius: 10,
                          background: active ? `${userColor}15` : '#F7F7F5',
                          color: active ? userColor : '#4A4A4A',
                          fontWeight: active ? 700 : 500,
                          fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          textAlign: 'left', fontFamily: 'var(--font)',
                          border: active ? `1px solid ${userColor}30` : '1px solid transparent',
                          position: 'relative',
                          transition: 'background 0.12s',
                        }}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0, opacity: active ? 1 : 0.65 }}>{item.icon}</span>
                        <span style={{ flex: 1, lineHeight: 1.3 }}>{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span style={{
                            background: item.badgeColor ?? '#EF4444', color: '#fff',
                            borderRadius: 100, fontSize: 10, fontWeight: 700,
                            padding: '1px 5px', minWidth: 16, textAlign: 'center',
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Create task */}
            <button
              onClick={() => { setShowMenu(false); onCreateTask(); }}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: userColor, color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', marginTop: 8, fontFamily: 'var(--font)',
                boxShadow: `0 4px 16px ${userColor}45`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>+</span> Создать задачу
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="bottom-nav">
        {mainItems.map(item => {
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

        {/* Create button */}
        <button
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

        {/* Menu button */}
        <button
          onClick={() => setShowMenu(v => !v)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '4px 0', border: 'none', background: 'transparent',
            cursor: 'pointer', position: 'relative',
            color: showMenu ? userColor : '#C0BDB9',
            transition: 'color 0.12s',
            fontFamily: 'var(--font)',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
          <span style={{ fontSize: 9, fontWeight: showMenu ? 600 : 400, letterSpacing: '0.1px' }}>Меню</span>
        </button>
      </nav>
    </>
  );
}
