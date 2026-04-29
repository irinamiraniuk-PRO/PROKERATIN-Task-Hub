import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const TZ = 'Europe/Minsk';

function toMinskLocalDate(date: Date): Date {
  return new Date(date.toLocaleDateString('en-CA', { timeZone: TZ }));
}

function getMondayOfWeek(date: Date): Date {
  const d = toMinskLocalDate(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function isSameDay(isoA: string, dateB: Date): boolean {
  const a = new Date(isoA);
  return a.toLocaleDateString('ru-RU', { timeZone: TZ }) === dateB.toLocaleDateString('ru-RU', { timeZone: TZ });
}

function isInCurrentWeek(iso: string, monday: Date): boolean {
  const dStr = toMinskLocalDate(new Date(iso));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return dStr >= monday && dStr <= sunday;
}

function StatCard({ label, value, sub, color, emoji }: { label: string; value: number | string; sub?: string; color: string; emoji?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px',
      border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        {emoji && <span>{emoji}</span>}{label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function MiniCalendar({ today, onDayClick }: { today: Date; onDayClick?: (d: Date) => void }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = toMinskLocalDate(today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
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
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#666', padding: '2px 6px' }}>‹</button>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', textTransform: 'capitalize' }}>{monthName}</div>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#666', padding: '2px 6px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 600, color: '#aaa', padding: '4px 0' }}>{d}</div>
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
                fontSize: 12, padding: '4px 2px', borderRadius: 6, cursor: onDayClick ? 'pointer' : 'default',
                background: isToday ? '#4A90D9' : 'transparent',
                color: isToday ? '#fff' : cell.getDay() === 0 || cell.getDay() === 6 ? '#F97316' : '#333',
                fontWeight: isToday ? 700 : 400,
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

export default function Dashboard({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (!currentUser) return null;

  const now = new Date();
  const todayMidnight = toMinskLocalDate(now);
  const monday = getMondayOfWeek(now);

  const myTasks = currentUser.role === 'director'
    ? tasks
    : tasks.filter(t =>
        t.assignedTo === currentUser.id ||
        (t.createdBy === currentUser.id) ||
        t.transferredTo === currentUser.id
      );

  const activeTasks = myTasks.filter(t => !['closed'].includes(t.status));

  const stats = {
    todayTasks: myTasks.filter(t => isSameDay(t.plannedDate ?? t.deadline, todayMidnight)).length,
    completedToday: myTasks.filter(t => ['completed', 'closed'].includes(t.status) && isSameDay(t.deadline, todayMidnight)).length,
    newTasks: activeTasks.filter(t => t.status === 'new').length,
    inProgress: activeTasks.filter(t => t.status === 'in_progress').length,
    waiting: activeTasks.filter(t => ['waiting_response', 'transferred'].includes(t.status)).length,
    pendingReview: activeTasks.filter(t => t.status === 'pending_director_review').length,
    returned: activeTasks.filter(t => t.status === 'returned_for_revision').length,
    completed: myTasks.filter(t => ['completed', 'closed'].includes(t.status)).length,
    overdue: activeTasks.filter(t => t.status === 'overdue' || (new Date(t.deadline) < now && !['completed', 'closed'].includes(t.status))).length,
  };

  const weekTasks = myTasks.filter(t => isInCurrentWeek(t.plannedDate ?? t.createdAt, monday));
  const weekCompleted = myTasks.filter(t => ['completed', 'closed'].includes(t.status) && isInCurrentWeek(t.deadline, monday));
  const weekEfficiency = weekTasks.length > 0 ? Math.round((weekCompleted.length / weekTasks.length) * 100) : 0;
  const totalEff = myTasks.length > 0 ? Math.round((stats.completed / myTasks.length) * 100) : 0;

  const todayActiveTasks = myTasks
    .filter(t => {
      const isPlannedToday = t.plannedDate && isSameDay(t.plannedDate, todayMidnight);
      const isDeadlineToday = isSameDay(t.deadline, todayMidnight);
      return (isPlannedToday || isDeadlineToday) && !['completed', 'closed'].includes(t.status);
    })
    .filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    })
    .slice(0, 8);

  const urgentTasks = myTasks
    .filter(t => !['completed', 'closed'].includes(t.status) && (t.priority === 'urgent' || t.status === 'overdue' || t.status === 'returned_for_revision'))
    .filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    })
    .slice(0, 5);

  const dayName = now.toLocaleDateString('ru-RU', { timeZone: TZ, weekday: 'long' });
  const dateLabel = now.toLocaleDateString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      {/* Welcome bar */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 700, color: '#111' }}>
            Добро пожаловать, {currentUser.name.split(' ')[0]}! 👋
          </h1>
          <div style={{ fontSize: 13, color: '#888', textTransform: 'capitalize' }}>
            {dayName}, {dateLabel} • {timeLabel} (Минск)
          </div>
        </div>
        {stats.pendingReview > 0 && (
          <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>🔍 На проверке у директора: {stats.pendingReview}</div>
          </div>
        )}
        {stats.returned > 0 && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#B91C1C' }}>↩️ Возвращено на доработку: {stats.returned}</div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        <StatCard emoji="📅" label="Сегодня" value={stats.todayTasks} sub="запланировано" color="#4A90D9" />
        <StatCard emoji="✅" label="Выполнено" value={stats.completedToday} sub="сегодня" color="#059669" />
        <StatCard emoji="▶️" label="В работе" value={stats.inProgress} sub="активных" color="#1D4ED8" />
        <StatCard emoji="🆕" label="Новые" value={stats.newTasks} sub="ожидают" color="#6366F1" />
        <StatCard emoji="⏳" label="Жду ответ" value={stats.waiting} sub="ожидание" color="#F97316" />
        <StatCard emoji="🔍" label="На проверке" value={stats.pendingReview} sub="у директора" color="#D97706" />
        <StatCard emoji="↩️" label="На доработку" value={stats.returned} sub="возвращено" color="#EF4444" />
        <StatCard emoji="⚠️" label="Просрочено" value={stats.overdue} sub="нужно действие" color="#B91C1C" />
      </div>

      {/* Efficiency + Calendar row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: 16, marginBottom: 20 }}>
        {/* Day efficiency */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>📈 Эффективность за неделю</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Выполнено задач за неделю</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: weekEfficiency >= 70 ? '#059669' : weekEfficiency >= 40 ? '#D97706' : '#EF4444' }}>
              {weekEfficiency}%
            </div>
          </div>
          <div style={{ height: 7, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${weekEfficiency}%`, background: weekEfficiency >= 70 ? '#10B981' : weekEfficiency >= 40 ? '#F59E0B' : '#EF4444', transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#aaa' }}>{weekCompleted.length} из {weekTasks.length} задач за текущую неделю</div>

          <div style={{ borderTop: '1px solid #F0F0F0', marginTop: 14, paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>Общая эффективность</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: totalEff >= 70 ? '#059669' : totalEff >= 40 ? '#D97706' : '#EF4444' }}>
                {totalEff}%
              </div>
            </div>
            <div style={{ height: 7, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${totalEff}%`, background: totalEff >= 70 ? '#10B981' : totalEff >= 40 ? '#F59E0B' : '#EF4444', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{stats.completed} из {myTasks.length} всего</div>
          </div>
        </div>

        {/* Today's tasks list */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>🗓️ Задачи на сегодня</div>
          {todayActiveTasks.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>☀️</div>
              Нет задач на сегодня
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todayActiveTasks.map(t => <TaskCard key={t.id} task={t} onClick={setSelectedTask} />)}
            </div>
          )}
        </div>

        {/* Mini calendar */}
        <MiniCalendar today={now} />
      </div>

      {/* Urgent and recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Urgent */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>🔥 Срочные и просроченные</div>
          {urgentTasks.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa' }}>Нет срочных задач 🎉</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {urgentTasks.map(t => <TaskCard key={t.id} task={t} onClick={setSelectedTask} />)}
            </div>
          )}
        </div>

        {/* Quick status breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>📊 Сводка по статусам</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Новые задачи', value: stats.newTasks, color: '#6366F1', bg: '#EEF2FF' },
              { label: 'В работе', value: stats.inProgress, color: '#1D4ED8', bg: '#DBEAFE' },
              { label: 'Жду ответа', value: stats.waiting, color: '#F97316', bg: '#FED7AA' },
              { label: 'На проверке у директора', value: stats.pendingReview, color: '#D97706', bg: '#FEF9C3' },
              { label: 'Возвращено на доработку', value: stats.returned, color: '#EF4444', bg: '#FEE2E2' },
              { label: 'Выполнено', value: stats.completed, color: '#059669', bg: '#D1FAE5' },
              { label: 'Просрочено', value: stats.overdue, color: '#B91C1C', bg: '#FEE2E2' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: '#FAFAF8' }}>
                <div style={{ fontSize: 12, color: '#555' }}>{s.label}</div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 6, background: s.bg, color: s.color }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
