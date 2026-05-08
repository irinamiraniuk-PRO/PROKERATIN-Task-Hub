import { useApp } from '../context/useApp';
import BrandLogo from './BrandLogo';

export type View =
  | 'dashboard'
  | 'calendar-planner'
  | 'week-planner'
  | 'kanban'
  | 'my-tasks'
  | 'incoming'
  | 'outgoing'
  | 'waiting'
  | 'pending-director'
  | 'director-review'
  | 'team'
  | 'archive'
  | 'settings'
  | 'knowledge-base'
  | 'notes'
  | 'onboarding';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onCreateTask: () => void;
}

export default function Sidebar({ currentView, onViewChange, onCreateTask }: SidebarProps) {
  const { state, logout } = useApp();
  const { currentUser, tasks } = state;

  if (!currentUser) return null;

  const isDirector = currentUser.role === 'director';
  const userColor = currentUser.color ?? '#BE185D';

  const incomingCount = tasks.filter(t =>
    t.transferredTo === currentUser.id && t.status === 'transferred'
  ).length;

  const reviewCount = tasks.filter(t => t.status === 'pending_director_review').length;

  const pendingMineCount = tasks.filter(t =>
    t.assignedTo === currentUser.id && t.status === 'pending_director_review'
  ).length;

  const returnedCount = tasks.filter(t =>
    t.assignedTo === currentUser.id && t.status === 'returned_for_revision'
  ).length;

  const waitingCount = tasks.filter(t =>
    t.assignedTo === currentUser.id && t.status === 'waiting_response'
  ).length;

  interface NavGroup {
    title?: string;
    items: {
      id: View;
      label: string;
      icon: string;
      badge?: number;
      badgeColor?: string;
      directorOnly?: boolean;
      employeeOnly?: boolean;
    }[];
  }

  const navGroups: NavGroup[] = [
    {
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
        { id: 'waiting', label: 'Жду ответ', icon: '◷', badge: waitingCount, badgeColor: '#F97316', employeeOnly: true },
        { id: 'pending-director', label: 'На проверке', icon: '◎', badge: pendingMineCount, badgeColor: '#D97706', employeeOnly: true },
        { id: 'director-review', label: 'На проверке', icon: '◎', badge: reviewCount, badgeColor: '#D97706', directorOnly: true },
      ],
    },
    {
      title: 'Управление',
      items: [
        { id: 'team', label: 'Команда', icon: '◈', directorOnly: true },
        { id: 'archive', label: 'Архив', icon: '▣' },
        { id: 'settings', label: 'Настройки', icon: '◌' },
      ],
    },
    {
      title: 'Помощник',
      items: [
        { id: 'notes', label: 'Заметки', icon: '📝' },
        { id: 'knowledge-base', label: 'База знаний', icon: '◦' },
        { id: 'onboarding', label: 'Онбординг', icon: '◇' },
      ],
    },
  ];

  const initials = currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      background: '#FBFBFA',
      borderRight: '1px solid #EEECEA',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #EEECEA' }}>
        <BrandLogo width={140} height={42} />
      </div>

      {/* Create button */}
      <div style={{ padding: '10px 12px 6px' }}>
        <button
          onClick={onCreateTask}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: userColor,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
            boxShadow: `0 2px 10px ${userColor}35`,
            letterSpacing: '-0.1px',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${userColor}45`; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 2px 10px ${userColor}35`; }}
        >
          <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>+</span>
          Новая задача
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 6px 8px', overflowY: 'auto' }}>
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => {
            if (item.directorOnly && !isDirector) return false;
            if (item.employeeOnly && isDirector) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi} style={{ marginBottom: 4 }}>
              {group.title && (
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#C0BDB9',
                  textTransform: 'uppercase',
                  letterSpacing: '0.7px',
                  padding: '10px 10px 3px',
                }}>
                  {group.title}
                </div>
              )}
              {visibleItems.map(item => {
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 1,
                      textAlign: 'left',
                      background: active ? `${userColor}12` : 'transparent',
                      color: active ? userColor : '#4A4A4A',
                      fontWeight: active ? 600 : 400,
                      fontSize: 13.5,
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#F1F0EE'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <span aria-hidden="true" style={{ fontSize: 13, flexShrink: 0, opacity: active ? 1 : 0.65, width: 16, textAlign: 'center' }}>{item.icon}</span>
                    <span style={{ flex: 1, lineHeight: 1.35 }}>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span style={{
                        background: item.badgeColor ?? '#EF4444',
                        color: '#fff',
                        borderRadius: 100,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        minWidth: 18,
                        textAlign: 'center',
                        lineHeight: '16px',
                        height: 16,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #EEECEA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${userColor}, ${userColor}AA)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 11,
            flexShrink: 0,
            boxShadow: `0 1px 5px ${userColor}35`,
          }}>
            {currentUser.avatar
              ? <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: 10, color: isDirector ? userColor : '#ADADAD', fontWeight: isDirector ? 600 : 400, marginTop: 0.5 }}>
              {isDirector ? '👑 Директор' : 'Сотрудник'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Выйти"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #E8E5E2',
              background: 'transparent',
              color: '#ADADAD',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E8E5E2'; e.currentTarget.style.color = '#ADADAD'; }}
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}
