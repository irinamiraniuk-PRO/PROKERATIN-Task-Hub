import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import { isStuck, getSmartHints, type SmartHint } from '../utils/taskAlerts';

const TZ = 'Europe/Minsk';

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

function StatCard({ label, value, sub, color, emoji, highlight }: {
  label: string; value: number | string; sub?: string; color: string; emoji?: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: highlight ? color : '#fff',
      borderRadius: 10,
      padding: '14px 16px',
      border: highlight ? 'none' : '1px solid #EEECEA',
      boxShadow: highlight ? `0 4px 16px ${color}35` : '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
        color: highlight ? 'rgba(255,255,255,0.75)' : '#ADADAD',
      }}>
        {emoji && <span>{emoji}</span>}{label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: highlight ? '#fff' : color, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 5, color: highlight ? 'rgba(255,255,255,0.65)' : '#C0BDB9' }}>{sub}</div>}
    </div>
  );
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

function SmartHintsPanel({ hints, onTaskClick }: { hints: SmartHint[]; onTaskClick?: (taskId: string) => void }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = hints.filter(h => !dismissed.has(h.id));
  if (visible.length === 0) return null;

  const bg: Record<SmartHint['type'], string> = {
    danger: '#FEF2F2',
    warning: '#FFFBEB',
    info: '#EFF6FF',
  };
  const border: Record<SmartHint['type'], string> = {
    danger: '#FECACA',
    warning: '#FDE68A',
    info: '#BFDBFE',
  };
  const textColor: Record<SmartHint['type'], string> = {
    danger: '#B91C1C',
    warning: '#92400E',
    info: '#1D4ED8',
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '-0.1px' }}>
        <span>💡</span> Умные подсказки
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {visible.map(hint => (
          <div
            key={hint.id}
            style={{
              background: bg[hint.type], border: `1px solid ${border[hint.type]}`,
              borderRadius: 8, padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: 9,
              cursor: hint.taskId ? 'pointer' : 'default',
            }}
            onClick={hint.taskId ? () => onTaskClick?.(hint.taskId!) : undefined}
          >
            <span style={{ fontSize: 15, flexShrink: 0 }}>{hint.emoji}</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: textColor[hint.type] }}>{hint.text}</span>
            <button
              onClick={e => { e.stopPropagation(); setDismissed(d => new Set([...d, hint.id])); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADADAD', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
              title="Скрыть подсказку"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser, users } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (!currentUser) return null;

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

  // Pending director review
  const pendingReviewTasks = applySearch(myTasks.filter(t => t.status === 'pending_director_review'));

  // Waiting response
  const waitingTasks = applySearch(myTasks.filter(t => t.status === 'waiting_response'));

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

  // Stuck tasks (no activity > 3 days)
  const stuckTasks = applySearch(activeTasks.filter(t =>
    !['completed', 'closed'].includes(t.status) && isStuck(t)
  ));

  // Smart hints
  const smartHints = getSmartHints(tasks, users, currentUser.id, isDirector);

  // Director extras
  const employees = users.filter(u => u.role === 'employee');

  const dayName = now.toLocaleDateString('ru-RU', { timeZone: TZ, weekday: 'long' });
  const dateLabel = now.toLocaleDateString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

  return (
    <div className="anim-fade-in" style={{ padding: '22px 26px 32px', maxWidth: 1140 }}>

      {/* Welcome bar */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.5px' }}>
          {firstName}, твой план на сегодня 🌟
        </h1>
        <div style={{ fontSize: 12.5, color: '#ADADAD', textTransform: 'capitalize', fontWeight: 400 }}>
          Сегодня: {dayName}, {dateLabel}, Минск • {timeLabel}
        </div>
      </div>

      {/* Alert banners */}
      {(overdueTasks.length > 0 || pendingReviewTasks.length > 0 || waitingTasks.length > 0) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {overdueTasks.length > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#EF4444' }}>Просрочено: {overdueTasks.length}</span>
            </div>
          )}
          {pendingReviewTasks.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>🔍</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#B45309' }}>На проверке: {pendingReviewTasks.length}</span>
            </div>
          )}
          {waitingTasks.length > 0 && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>⏳</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#C2410C' }}>Ждут ответа: {waitingTasks.length}</span>
            </div>
          )}
          {stuckTasks.length > 0 && (
            <div style={{ background: '#F7F7F5', border: '1px solid #EEECEA', borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>😴</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Зависли: {stuckTasks.length}</span>
            </div>
          )}
        </div>
      )}

      {/* Smart hints */}
      <SmartHintsPanel
        hints={smartHints}
        onTaskClick={taskId => {
          const t = tasks.find(x => x.id === taskId);
          if (t) setSelectedTask(t);
        }}
      />

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 9, marginBottom: 20 }}>
        <StatCard emoji="📅" label="Сегодня" value={todayTasks.length} sub="запланировано" color="#BE185D" highlight={todayTasks.length > 0} />
        <StatCard emoji="✅" label="Выполнено" value={completedToday} sub="сегодня" color="#059669" />
        <StatCard emoji="📊" label="% дня" value={`${dayPct}%`} sub="выполнения" color={dayPct >= 70 ? '#059669' : dayPct >= 40 ? '#D97706' : '#6366F1'} />
        <StatCard emoji="▶️" label="В работе" value={inProgress} sub="активных" color="#1D4ED8" />
        <StatCard emoji="⏳" label="Жду ответ" value={waitingTasks.length} sub="ожидание" color="#F97316" />
        <StatCard emoji="🔍" label="На проверке" value={pendingReviewTasks.length} sub="у директора" color="#D97706" />
        <StatCard emoji="⚠️" label="Просрочено" value={overdueTasks.length} sub="нужно действие" color="#B91C1C" highlight={overdueTasks.length > 0} />
        <StatCard emoji="😴" label="Зависли" value={stuckTasks.length} sub="без движения" color="#6B7280" highlight={stuckTasks.length > 0} />
      </div>

      {/* Calendar + efficiency row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: 14, marginBottom: 20 }}>

        {/* Efficiency panel */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #EEECEA', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <SectionHeader emoji="📈" title="Эффективность" />
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>За неделю</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: weekEfficiency >= 70 ? '#059669' : weekEfficiency >= 40 ? '#D97706' : '#EF4444', letterSpacing: '-0.3px' }}>{weekEfficiency}%</div>
            </div>
            <div style={{ height: 6, background: '#F1F0EE', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${weekEfficiency}%`, background: weekEfficiency >= 70 ? '#10B981' : weekEfficiency >= 40 ? '#F59E0B' : '#EF4444', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#ADADAD' }}>{weekDoneCount} из {weekTasks.length + weekDoneCount} задач</div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>Общая</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: totalEff >= 70 ? '#059669' : totalEff >= 40 ? '#D97706' : '#EF4444', letterSpacing: '-0.3px' }}>{totalEff}%</div>
            </div>
            <div style={{ height: 6, background: '#F1F0EE', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${totalEff}%`, background: totalEff >= 70 ? '#10B981' : totalEff >= 40 ? '#F59E0B' : '#EF4444', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#ADADAD' }}>{totalCompleted} из {myTasks.length} всего</div>
          </div>

          <div style={{ borderTop: '1px solid #F1F0EE', marginTop: 12, paddingTop: 12 }}>
            <SectionHeader emoji="📊" title="Сводка статусов" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { label: 'В работе', value: inProgress, color: '#1D4ED8', bg: '#EFF6FF' },
                { label: 'Жду ответа', value: waitingTasks.length, color: '#F97316', bg: '#FFF7ED' },
                { label: 'На проверке', value: pendingReviewTasks.length, color: '#D97706', bg: '#FFFBEB' },
                { label: 'Просрочено', value: overdueTasks.length, color: '#EF4444', bg: '#FEF2F2' },
                { label: 'Выполнено', value: totalCompleted, color: '#059669', bg: '#ECFDF5' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: '#F7F7F5' }}>
                  <div style={{ fontSize: 12, color: '#6B6B6B' }}>{s.label}</div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: '1px 7px', borderRadius: 5, background: s.bg, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today tasks */}
        <TaskSection
          emoji="🗓️"
          title="Задачи на сегодня"
          tasks={todayTasks}
          onSelect={setSelectedTask}
          emptyIcon="☀️"
          emptyText="Нет задач на сегодня"
          accentColor="#BE185D"
          maxItems={5}
        />

        {/* Mini calendar */}
        <MiniCalendar today={now} />
      </div>

      {/* Tomorrow + Week row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <TaskSection
          emoji="⏭️"
          title="Задачи на завтра"
          tasks={tomorrowTasks}
          onSelect={setSelectedTask}
          emptyIcon="🌅"
          emptyText="Нет задач на завтра"
          accentColor="#6366F1"
          maxItems={5}
        />
        <TaskSection
          emoji="📆"
          title="Задачи на неделю"
          tasks={weekTasks}
          onSelect={setSelectedTask}
          emptyIcon="🗂️"
          emptyText="Нет задач на этой неделе"
          accentColor="#1D4ED8"
          maxItems={5}
        />
      </div>

      {/* Overdue + Pending review + Waiting + Stuck row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        <TaskSection
          emoji="🔥"
          title="Просроченные"
          tasks={overdueTasks}
          onSelect={setSelectedTask}
          emptyIcon="🎉"
          emptyText="Нет просроченных задач"
          accentColor="#B91C1C"
          maxItems={4}
        />
        <TaskSection
          emoji="🔍"
          title="На проверке у директора"
          tasks={pendingReviewTasks}
          onSelect={setSelectedTask}
          emptyIcon="✅"
          emptyText="Нет задач на проверке"
          accentColor="#D97706"
          maxItems={4}
        />
        <TaskSection
          emoji="⏳"
          title="Ждут ответа"
          tasks={waitingTasks}
          onSelect={setSelectedTask}
          emptyIcon="📨"
          emptyText="Нет задач, ожидающих ответа"
          accentColor="#F97316"
          maxItems={4}
        />
        <TaskSection
          emoji="😴"
          title="Зависшие задачи"
          tasks={stuckTasks}
          onSelect={setSelectedTask}
          emptyIcon="✓"
          emptyText="Нет зависших задач"
          accentColor="#6B7280"
          maxItems={4}
        />
      </div>

      {/* Director extras */}
      {isDirector && (
        <div style={{ marginTop: 8 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.2px' }}>◈ Команда</h2>
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
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${empColor}, ${empColor}AA)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
                    }}>
                      {emp.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.1px' }}>{emp.name}</div>
                      <div style={{ fontSize: 10, color: '#ADADAD' }}>{empActive.length} активных задач</div>
                    </div>
                  </div>
                  {/* Load bar */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#ADADAD' }}>Загрузка</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: empEff >= 70 ? '#059669' : empEff >= 40 ? '#D97706' : '#6B7280' }}>{empEff}%</span>
                    </div>
                    <div style={{ height: 4, background: '#F1F0EE', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${empEff}%`, background: empEff >= 70 ? '#10B981' : empEff >= 40 ? '#F59E0B' : '#6B7280', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                  {/* Badges */}
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
