import { useState } from 'react';
import { useApp } from '../context/useApp';
import type { Task } from '../types';
import type { View } from './Sidebar';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const TZ = 'Europe/Minsk';
const QUICK_NOTE_EMOJI = '📝';
const QUICK_NOTE_COLOR = '#FFFBEB';
const NOTE_PREVIEW_LENGTH = 80;

function createTodoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const random = new Uint32Array(2);
    crypto.getRandomValues(random);
    return `${Date.now().toString(36)}_${random[0].toString(36)}${random[1].toString(36)}`;
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Status colour/label map — defined once outside the component to avoid per-render recreation
const STATUS_META: Record<string, { col: string; label: string }> = {
  new: { col: '#6366F1', label: 'Новая' },
  accepted: { col: '#059669', label: 'Принята' },
  in_progress: { col: '#1D4ED8', label: 'В работе' },
  pending_director_review: { col: '#D97706', label: 'На проверке' },
  returned_for_revision: { col: '#EF4444', label: 'На доработку' },
  waiting_response: { col: '#F97316', label: 'Ждёт ответа' },
  overdue: { col: '#B91C1C', label: 'Просрочена' },
  transferred: { col: '#3B82F6', label: 'Передана' },
  postponed: { col: '#9CA3AF', label: 'Отложена' },
  blocked: { col: '#EF4444', label: 'Заблокирована' },
  completed: { col: '#059669', label: 'Выполнена' },
  closed: { col: '#6B7280', label: 'Закрыта' },
};

function toMinskDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TZ });
}

function getMondayOfWeek(date: Date): Date {
  const localStr = date.toLocaleDateString('en-CA', { timeZone: TZ });
  const [y, m, d] = localStr.split('-').map(Number);
  const local = new Date(y, m - 1, d);
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);
  return local;
}

function isSameDayStr(isoA: string, dateStrB: string): boolean {
  const a = new Date(isoA);
  return a.toLocaleDateString('en-CA', { timeZone: TZ }) === dateStrB;
}

function isInCurrentWeek(iso: string, monday: Date): boolean {
  const d = new Date(iso);
  const dStr = d.toLocaleDateString('en-CA', { timeZone: TZ });
  const [dy, dm, dd] = dStr.split('-').map(Number);
  const dLocal = new Date(dy, dm - 1, dd);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return dLocal >= monday && dLocal <= sunday;
}


function SectionHeader({ emoji, title, count, color }: { emoji: string; title: string; count?: number; color?: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.1px' }}>
      <span>{emoji}</span>
      <span>{title}</span>
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 100, background: (color ?? '#EF4444') + '18', color: color ?? '#EF4444' }}>
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ fontSize: 13, color: '#C0BDB9', textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 22, marginBottom: 7 }}>{icon}</div>
      {text}
    </div>
  );
}

function MiniCalendar({ today, onDayClick }: { today: Date; onDayClick?: (d: Date) => void }) {
  const [viewDate, setViewDate] = useState(() => {
    const localStr = today.toLocaleDateString('en-CA', { timeZone: TZ });
    const [y, m] = localStr.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const todayStr = today.toLocaleDateString('en-CA', { timeZone: TZ });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #EEECEA', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#ADADAD', padding: '2px 6px', borderRadius: 5, transition: 'color 0.12s' }}>‹</button>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1A1A1A', textTransform: 'capitalize', letterSpacing: '-0.1px' }}>{monthName}</div>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#ADADAD', padding: '2px 6px', borderRadius: 5, transition: 'color 0.12s' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 600, color: '#C0BDB9', padding: '3px 0' }}>{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const cellStr = cell.toLocaleDateString('en-CA');
          const isToday = cellStr === todayStr;
          return (
            <div
              key={i}
              onClick={() => onDayClick?.(cell)}
              style={{
                fontSize: 11.5, padding: '4px 2px', borderRadius: 5, cursor: onDayClick ? 'pointer' : 'default',
                background: isToday ? '#BE185D' : 'transparent',
                color: isToday ? '#fff' : cell.getDay() === 0 || cell.getDay() === 6 ? '#F97316' : '#3A3A3A',
                fontWeight: isToday ? 700 : 400,
                transition: 'background 0.12s',
              }}
            >
              {cell.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskSection({ title, emoji, tasks, onSelect, emptyIcon, emptyText, accentColor, maxItems = 6 }: {
  title: string; emoji: string; tasks: Task[]; onSelect: (t: Task) => void;
  emptyIcon: string; emptyText: string; accentColor?: string; maxItems?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tasks : tasks.slice(0, maxItems);
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #EEECEA', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <SectionHeader emoji={emoji} title={title} count={tasks.length} color={accentColor} />
      {tasks.length === 0 ? (
        <EmptyState icon={emptyIcon} text={emptyText} />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {shown.map(t => <TaskCard key={t.id} task={t} onClick={onSelect} />)}
          </div>
          {tasks.length > maxItems && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ marginTop: 9, width: '100%', padding: '7px', border: '1px solid #EEECEA', borderRadius: 7, background: '#F7F7F5', cursor: 'pointer', fontSize: 12, color: '#6B6B6B', fontWeight: 500, fontFamily: 'var(--font)', transition: 'background 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EEECEA'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F7F7F5'; }}
            >
              {expanded ? '▲ Свернуть' : `▼ Показать ещё ${tasks.length - maxItems}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function Dashboard({ searchQuery, onViewChange, onOpenNotifications }: { searchQuery: string; onViewChange?: (view: View) => void; onOpenNotifications?: () => void }) {
  const { state, createNote, setDashboardTodos } = useApp();
  const { tasks, currentUser, users, notifications, notes, dashboardTodos } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'week' | 'incoming' | 'overdue'>('today');
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [todoInput, setTodoInput] = useState('');

  if (!currentUser) return null;
  const currentUserId = currentUser.id;
  const todoItems = dashboardTodos[currentUserId] ?? [];

  const unreadNotifCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;

  const now = new Date();
  const todayStr = toMinskDateStr(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = toMinskDateStr(tomorrowDate);
  const monday = getMondayOfWeek(now);

  const isDirector = currentUser.role === 'director';
  const firstName = currentUser.name.split(' ')[0];

  const myTasks = isDirector
    ? tasks
    : tasks.filter(t =>
        t.assignedTo === currentUser.id ||
        t.createdBy === currentUser.id ||
        t.transferredTo === currentUser.id
      );

  const activeTasks = myTasks.filter(t => !['closed'].includes(t.status));

  function applySearch(list: Task[]): Task[] {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  // Today tasks
  const todayTasks = applySearch(myTasks.filter(t => {
    const isPlannedToday = t.plannedDate && isSameDayStr(t.plannedDate, todayStr);
    const isDeadlineToday = isSameDayStr(t.deadline, todayStr);
    return (isPlannedToday || isDeadlineToday) && !['completed', 'closed'].includes(t.status);
  }));

  // Tomorrow tasks
  const tomorrowTasks = applySearch(myTasks.filter(t => {
    const isPlannedTomorrow = t.plannedDate && isSameDayStr(t.plannedDate, tomorrowStr);
    const isDeadlineTomorrow = isSameDayStr(t.deadline, tomorrowStr);
    return (isPlannedTomorrow || isDeadlineTomorrow) && !['completed', 'closed'].includes(t.status);
  }));

  // Week tasks (Mon-Sun)
  const weekTasks = applySearch(myTasks.filter(t =>
    isInCurrentWeek(t.plannedDate ?? t.deadline, monday) && !['completed', 'closed'].includes(t.status)
  ));

  // Overdue
  const overdueTasks = applySearch(activeTasks.filter(t =>
    t.status === 'overdue' || (new Date(t.deadline) < now && !['completed', 'closed'].includes(t.status))
  ));

  // Stats
  const completedToday = myTasks.filter(t =>
    ['completed', 'closed'].includes(t.status) && isSameDayStr(t.deadline, todayStr)
  ).length;
  const dayTotal = todayTasks.length + completedToday;
  const dayPct = dayTotal > 0 ? Math.round((completedToday / dayTotal) * 100) : 0;

  const inProgress = activeTasks.filter(t => t.status === 'in_progress').length;

  // Week efficiency
  const weekDoneCount = myTasks.filter(t => ['completed', 'closed'].includes(t.status) && isInCurrentWeek(t.deadline, monday)).length;
  const weekEfficiency = weekTasks.length + weekDoneCount > 0 ? Math.round((weekDoneCount / (weekTasks.length + weekDoneCount)) * 100) : 0;

  const totalCompleted = myTasks.filter(t => ['completed', 'closed'].includes(t.status)).length;
  const totalEff = myTasks.length > 0 ? Math.round((totalCompleted / myTasks.length) * 100) : 0;

  const color = currentUser.color ?? '#BE185D';
  const incomingTasks = applySearch(tasks.filter(t =>
    t.transferredTo === currentUser.id && t.status === 'transferred'
  ));
  const myRecentNotes = notes
    .filter(n => n.userId === currentUser.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  // Director extras
  const employees = users.filter(u => u.role === 'employee');

  const dayName = now.toLocaleDateString('ru-RU', { timeZone: TZ, weekday: 'long' });
  const dateLabel = now.toLocaleDateString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

  function handleCreateQuickNote() {
    if (!quickNoteTitle.trim() && !quickNoteContent.trim()) return;
    createNote({
      title: quickNoteTitle.trim() || 'Новая заметка',
      content: quickNoteContent.trim(),
      emoji: QUICK_NOTE_EMOJI,
      color: QUICK_NOTE_COLOR,
    });
    setQuickNoteTitle('');
    setQuickNoteContent('');
  }

  function handleAddTodo() {
    const text = todoInput.trim();
    if (!text) return;
    setDashboardTodos(currentUserId, [{ id: createTodoId(), text, done: false }, ...todoItems]);
    setTodoInput('');
  }

  function handleUpdateTodo(id: string, text: string) {
    setDashboardTodos(currentUserId, todoItems.map(item => item.id === id ? { ...item, text } : item));
  }

  function handleDeleteTodo(id: string) {
    setDashboardTodos(currentUserId, todoItems.filter(item => item.id !== id));
  }

  function handleTodoBlur(id: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      handleDeleteTodo(id);
      return;
    }
    if (trimmed !== text) {
      handleUpdateTodo(id, trimmed);
    }
  }

  return (
    <div className="anim-fade-in" style={{ padding: '20px 22px 32px', maxWidth: 1140, background: '#F0EFF9', minHeight: '100%' }}>

      {/* ── Welcome card ── */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
        boxShadow: '0 2px 16px rgba(100,60,200,0.07)', border: '1px solid #ECEAFF',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: `linear-gradient(135deg, ${color}, ${color}BB)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 18,
          boxShadow: `0 4px 16px ${color}40`,
        }}>
          {currentUser.avatar
            ? <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : firstName[0]?.toUpperCase()
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#ADADAD', fontWeight: 400 }}>Добро пожаловать</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.name}{currentUser.role === 'director' ? ' ✦' : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }} className="topbar-greeting">
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', textTransform: 'capitalize', letterSpacing: '-0.2px' }}>{dayName}</div>
          <div style={{ fontSize: 11, color: '#ADADAD', marginTop: 1 }}>{dateLabel}</div>
        </div>
        <button
          onClick={onOpenNotifications}
          disabled={!onOpenNotifications}
          style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0, position: 'relative',
            background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: onOpenNotifications ? 'pointer' : 'default',
            transition: 'background 0.12s',
          }}
          title="Уведомления"
          onMouseEnter={e => { if (onOpenNotifications) e.currentTarget.style.background = `${color}20`; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${color}10`; }}
        >
          <span style={{ fontSize: 17 }}>🔔</span>
          {unreadNotifCount > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6, width: 8, height: 8,
              background: '#EF4444', borderRadius: '50%', border: '1.5px solid #fff',
            }} />
          )}
        </button>
      </div>

      {/* ── Overview stats ── */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 16,
        boxShadow: '0 2px 16px rgba(100,60,200,0.07)', border: '1px solid #ECEAFF',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.3px' }}>Обзор</span>
          <span style={{ fontSize: 11, color: '#6B6B6B', background: `${color}10`, padding: '4px 12px', borderRadius: 20, fontWeight: 500 }}>{timeLabel}</span>
        </div>
        <div className="dashboard-stats-grid">
          {([
            { label: 'Сегодня', value: todayTasks.length, sub: 'запланировано', accent: color, nav: 'my-tasks' as View, den: Math.max(dayTotal, 1) },
            { label: 'Выполнено', value: completedToday, sub: 'сегодня', accent: '#059669', nav: 'my-tasks' as View, den: Math.max(dayTotal, 1) },
            { label: 'В работе', value: inProgress, sub: 'активных', accent: '#1D4ED8', nav: 'my-tasks' as View, den: Math.max(activeTasks.length, 1) },
            { label: 'На неделе', value: weekTasks.length, sub: 'задач', accent: '#6366F1', nav: 'week-planner' as View, den: Math.max(weekTasks.length + weekDoneCount, 1) },
          ]).map(s => (
            <div
              key={s.label}
              onClick={() => onViewChange?.(s.nav)}
              style={{ background: `${s.accent}0F`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: s.accent, letterSpacing: '-1px', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: '#3A3A3A', marginTop: 3, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: '#ADADAD', marginBottom: 8 }}>{s.sub}</div>
              <div style={{ height: 3, background: `${s.accent}20`, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: s.accent,
                  width: `${Math.min(100, Math.round((s.value / s.den) * 100))}%`,
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main 2-col: task list (left) + calendar/summary (right) ── */}
      <div className="dashboard-main-grid">

        {/* LEFT: Tab filter + task list */}
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {([
              { id: 'today' as const, label: 'Сегодня', count: todayTasks.length },
              { id: 'tomorrow' as const, label: 'Завтра', count: tomorrowTasks.length },
              { id: 'week' as const, label: 'На неделе', count: weekTasks.length },
              { id: 'incoming' as const, label: 'Входящие', count: incomingTasks.length },
              { id: 'overdue' as const, label: 'Просрочено', count: overdueTasks.length },
            ]).map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '7px 16px', borderRadius: 24, border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontFamily: 'var(--font)',
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? color : '#fff',
                    color: isActive ? '#fff' : '#6B6B6B',
                    boxShadow: isActive ? `0 4px 14px ${color}35` : '0 1px 4px rgba(0,0,0,0.08)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
                </button>
              );
            })}
          </div>

          <TaskSection
            emoji={
              activeTab === 'today' ? '🗓️'
              : activeTab === 'tomorrow' ? '⏭️'
              : activeTab === 'week' ? '📆'
              : activeTab === 'incoming' ? '↓'
              : '🔥'
            }
            title={
              activeTab === 'today' ? 'Задачи на сегодня'
              : activeTab === 'tomorrow' ? 'Задачи на завтра'
              : activeTab === 'week' ? 'На этой неделе'
              : activeTab === 'incoming' ? 'Входящие задачи'
              : 'Просроченные задачи'
            }
            tasks={
              activeTab === 'today' ? todayTasks
              : activeTab === 'tomorrow' ? tomorrowTasks
              : activeTab === 'week' ? weekTasks
              : activeTab === 'incoming' ? incomingTasks
              : overdueTasks
            }
            onSelect={setSelectedTask}
            emptyIcon={
              activeTab === 'today' ? '☀️'
              : activeTab === 'tomorrow' ? '🌅'
              : activeTab === 'week' ? '🗂️'
              : activeTab === 'incoming' ? '📨'
              : '🎉'
            }
            emptyText={
              activeTab === 'today' ? 'Нет задач на сегодня'
              : activeTab === 'tomorrow' ? 'Нет задач на завтра'
              : activeTab === 'week' ? 'Нет задач на этой неделе'
              : activeTab === 'incoming' ? 'Нет входящих задач'
              : 'Нет просроченных задач!'
            }
            accentColor={
              activeTab === 'overdue' ? '#EF4444'
              : activeTab === 'incoming' ? '#3B82F6'
              : color
            }
            maxItems={8}
          />
        </div>

        {/* RIGHT: Calendar + today summary + efficiency */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MiniCalendar today={now} />

          {/* Efficiency */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #ECEAFF', boxShadow: '0 2px 10px rgba(100,60,200,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>📈 Эффективность</div>
            {[
              { label: 'Сегодня', pct: dayPct, done: completedToday, total: dayTotal },
              { label: 'За неделю', pct: weekEfficiency, done: weekDoneCount, total: weekTasks.length + weekDoneCount },
              { label: 'Общая', pct: totalEff, done: totalCompleted, total: myTasks.length },
            ].map(e => (
              <div key={e.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, color: '#6B6B6B' }}>{e.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: e.pct >= 70 ? '#10B981' : e.pct >= 40 ? '#F59E0B' : '#EF4444' }}>{e.pct}%</span>
                </div>
                <div style={{ height: 5, background: '#F1F0EE', borderRadius: 4, overflow: 'hidden', marginBottom: 3 }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${e.pct}%`, background: e.pct >= 70 ? '#10B981' : e.pct >= 40 ? '#F59E0B' : '#EF4444', transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 10, color: '#ADADAD' }}>{e.done} из {e.total} задач</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }} className="responsive-grid-2">
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #ECEAFF', boxShadow: '0 2px 10px rgba(100,60,200,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>📝 Быстрые заметки</span>
            <button
              onClick={() => onViewChange?.('notes')}
              style={{ border: 'none', background: 'none', color, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
            >
              Все заметки →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            <input
              value={quickNoteTitle}
              onChange={e => setQuickNoteTitle(e.target.value)}
              placeholder="Заголовок"
              style={{ width: '100%', border: '1px solid #EEECEA', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, outline: 'none' }}
            />
            <textarea
              value={quickNoteContent}
              onChange={e => setQuickNoteContent(e.target.value)}
              placeholder="Текст заметки..."
              style={{ width: '100%', border: '1px solid #EEECEA', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, outline: 'none', minHeight: 70, resize: 'vertical' }}
            />
            <button
              onClick={handleCreateQuickNote}
              disabled={!quickNoteTitle.trim() && !quickNoteContent.trim()}
              style={{
                alignSelf: 'flex-start', border: 'none', borderRadius: 8, padding: '7px 12px',
                fontSize: 12, fontWeight: 600, cursor: (!quickNoteTitle.trim() && !quickNoteContent.trim()) ? 'default' : 'pointer',
                background: (!quickNoteTitle.trim() && !quickNoteContent.trim()) ? '#E5E7EB' : color,
                color: '#fff',
              }}
            >
              + Создать заметку
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myRecentNotes.length === 0 ? (
              <div style={{ fontSize: 12, color: '#ADADAD' }}>Пока нет заметок</div>
            ) : (
              myRecentNotes.map(note => (
                <div key={note.id} style={{ background: '#F9FAFB', border: '1px solid #EEECEA', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1A1A1A' }}>{note.emoji} {note.title}</div>
                  {note.content && <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3 }}>{note.content.slice(0, NOTE_PREVIEW_LENGTH)}{note.content.length > NOTE_PREVIEW_LENGTH ? '…' : ''}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #ECEAFF', boxShadow: '0 2px 10px rgba(100,60,200,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>☑️ To-Do List</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTodo(); }}
              placeholder="Новый пункт..."
              style={{ flex: 1, border: '1px solid #EEECEA', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, outline: 'none' }}
            />
            <button
              onClick={handleAddTodo}
              disabled={!todoInput.trim()}
              style={{
                border: 'none', borderRadius: 8, padding: '7px 12px',
                fontSize: 12, fontWeight: 600, cursor: todoInput.trim() ? 'pointer' : 'default',
                background: todoInput.trim() ? color : '#E5E7EB', color: '#fff',
              }}
            >
              Добавить
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {todoItems.length === 0 ? (
              <div style={{ fontSize: 12, color: '#ADADAD' }}>Список пуст</div>
            ) : (
              todoItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1px solid #EEECEA', borderRadius: 8, padding: '7px 8px' }}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => setDashboardTodos(
                      currentUserId,
                      todoItems.map(todo => todo.id === item.id ? { ...todo, done: !todo.done } : todo),
                    )}
                  />
                  <input
                    value={item.text}
                    onChange={e => handleUpdateTodo(item.id, e.target.value)}
                    onBlur={e => handleTodoBlur(item.id, e.target.value)}
                    style={{
                      flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5,
                      color: item.done ? '#9CA3AF' : '#1A1A1A',
                      textDecoration: item.done ? 'line-through' : 'none',
                    }}
                  />
                  <button
                    onClick={() => handleDeleteTodo(item.id)}
                    style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                    title="Удалить пункт"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Director extras ── */}
      {isDirector && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.2px' }}>◈ Команда</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {employees.map(emp => {
              const empTasks = tasks.filter(t => t.assignedTo === emp.id);
              const empActive = empTasks.filter(t => !['closed', 'completed'].includes(t.status));
              const empCompleted = empTasks.filter(t => ['completed', 'closed'].includes(t.status)).length;
              const empOverdue = empActive.filter(t => t.status === 'overdue' || (new Date(t.deadline) < now && !['completed', 'closed'].includes(t.status))).length;
              const empPending = empActive.filter(t => t.status === 'pending_director_review').length;
              const empWaiting = empActive.filter(t => t.status === 'waiting_response').length;
              const empEff = empTasks.length > 0 ? Math.round((empCompleted / empTasks.length) * 100) : 0;
              const empColor = emp.color ?? '#BE185D';
              return (
                <div key={emp.id} style={{ background: '#fff', borderRadius: 10, padding: '13px 15px', border: '1px solid #EEECEA', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(135deg, ${empColor}, ${empColor}AA)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                      {emp.avatar
                        ? <img src={emp.avatar} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : emp.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.1px' }}>{emp.name}</div>
                      <div style={{ fontSize: 10, color: '#ADADAD' }}>{empActive.length} активных задач</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#ADADAD' }}>Загрузка</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: empEff >= 70 ? '#059669' : empEff >= 40 ? '#D97706' : '#6B7280' }}>{empEff}%</span>
                    </div>
                    <div style={{ height: 4, background: '#F1F0EE', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${empEff}%`, background: empEff >= 70 ? '#10B981' : empEff >= 40 ? '#F59E0B' : '#6B7280', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {empOverdue > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FEF2F2', color: '#EF4444' }}>⚠️ {empOverdue} просроч.</span>}
                    {empPending > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FFFBEB', color: '#B45309' }}>🔍 {empPending} проверка</span>}
                    {empWaiting > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FFF7ED', color: '#C2410C' }}>⏳ {empWaiting} ждёт</span>}
                    {empOverdue === 0 && empPending === 0 && empWaiting === 0 && (
                      <span style={{ fontSize: 10, color: '#ADADAD' }}>Всё ок ✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
