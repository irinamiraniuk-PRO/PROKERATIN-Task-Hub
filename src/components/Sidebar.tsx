import { useApp } from '../context/AppContext';

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
  | 'settings';

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
        { id: 'dashboard', label: 'Главная', icon: '🏠' },
        { id: 'calendar-planner', label: 'Дашборд', icon: '📊' },
      ],
    },
    {
      title: 'Планирование',
      items: [
        { id: 'week-planner', label: 'Планер недели', icon: '📅' },
        { id: 'kanban', label: 'Канбан-доска', icon: '⬛' },
      ],
    },
    {
      title: 'Задачи',
      items: [
        { id: 'my-tasks', label: 'Мои задачи', icon: '📋', badge: returnedCount > 0 ? returnedCount : undefined, badgeColor: '#EF4444' },
        { id: 'incoming', label: 'Входящие', icon: '📥', badge: incomingCount, badgeColor: '#3B82F6' },
        { id: 'outgoing', label: 'Исходящие', icon: '📤' },
        { id: 'waiting', label: 'Жду ответ', icon: '⏳', badge: waitingCount, badgeColor: '#F97316', employeeOnly: true },
        { id: 'pending-director', label: 'На проверке у директора', icon: '🔍', badge: pendingMineCount, badgeColor: '#D97706', employeeOnly: true },
        { id: 'director-review', label: 'Задачи на проверке', icon: '📋', badge: reviewCount, badgeColor: '#D97706', directorOnly: true },
      ],
    },
    {
      title: 'Управление',
      items: [
        { id: 'team', label: 'Команда', icon: '👥', directorOnly: true },
        { id: 'archive', label: 'Архив', icon: '🗂️' },
        { id: 'settings', label: 'Настройки', icon: '⚙️' },
      ],
    },
  ];

  const initials = currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside style={{
      width: 230,
      flexShrink: 0,
      background: '#fff',
      borderRight: '1px solid #EBEBEB',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #BE185D, #EC4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}>
            ✦
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111', letterSpacing: '-0.4px' }}>PROKERATIN</div>
            <div style={{ fontSize: 9, color: '#bbb', letterSpacing: '0.3px' }}>Task Hub CRM</div>
          </div>
        </div>
      </div>

      {/* Create button */}
      <div style={{ padding: '12px 14px 8px' }}>
        <button
          onClick={onCreateTask}
          style={{
            width: '100%',
            padding: '9px',
            background: `linear-gradient(135deg, ${userColor}, ${userColor}CC)`,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'opacity 0.2s, transform 0.15s',
            boxShadow: `0 3px 12px ${userColor}44`,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
        >
          <span style={{ fontSize: 16 }}>+</span> Новая задача
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto' }}>
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => {
            if (item.directorOnly && !isDirector) return false;
            if (item.employeeOnly && isDirector) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi} style={{ marginBottom: 8 }}>
              {group.title && (
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#ccc',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  padding: '8px 10px 4px',
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
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 1,
                      textAlign: 'left',
                      background: active ? `${userColor}15` : 'transparent',
                      color: active ? userColor : '#444',
                      fontWeight: active ? 700 : 400,
                      fontSize: 13,
                      transition: 'all 0.15s',
                      borderLeft: active ? `3px solid ${userColor}` : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#F5F5F5'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, lineHeight: 1.3 }}>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span style={{
                        background: item.badgeColor ?? '#EF4444',
                        color: '#fff',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 5px',
                        minWidth: 16,
                        textAlign: 'center',
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
      <div style={{ padding: '12px 14px', borderTop: '1px solid #F0F0F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${userColor}, ${userColor}99)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            flexShrink: 0,
            boxShadow: `0 2px 6px ${userColor}44`,
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: 10, color: isDirector ? userColor : '#aaa', fontWeight: isDirector ? 700 : 400 }}>
              {isDirector ? '👑 Директор' : 'Сотрудник'}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: '7px',
            background: '#FFF5F5',
            color: '#B91C1C',
            border: '1px solid #FECACA',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFF5F5'; }}
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
