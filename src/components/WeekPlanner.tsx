import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import TaskModal from './TaskModal';
import { STATUS_LABELS, statusColor, priorityColor, formatDate, isOverdue } from './TaskCard';

const MAX_UNPLANNED_DISPLAY = 8;

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date: Date): string {
  return date.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toISODateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

interface MiniTaskCardProps {
  task: Task;
  onClick: (t: Task) => void;
  onDragStart: (e: React.DragEvent, t: Task) => void;
}

function MiniTaskCard({ task, onClick, onDragStart }: MiniTaskCardProps) {
  const sc = statusColor(task.status);
  const pc = priorityColor(task.priority);
  const overdue = isOverdue(task.deadline) && !['completed', 'closed'].includes(task.status);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onClick={() => onClick(task)}
      style={{
        background: '#fff', borderRadius: 8, padding: '8px 10px',
        border: `1px solid ${overdue ? '#FCA5A5' : '#E8E8E8'}`,
        borderLeft: `3px solid ${pc}`,
        cursor: 'grab', fontSize: 12, marginBottom: 4,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
    >
      <div style={{ fontWeight: 600, color: '#111', marginBottom: 3, lineHeight: 1.3 }}>
        {task.title.length > 40 ? task.title.slice(0, 40) + '…' : task.title}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, background: sc.bg, color: sc.text, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
          {STATUS_LABELS[task.status]}
        </span>
        <span style={{ fontSize: 10, color: overdue ? '#B91C1C' : '#999' }}>
          {overdue ? '⚠️ ' : ''}{formatDate(task.deadline)}
        </span>
      </div>
    </div>
  );
}

export default function WeekPlanner({ searchQuery }: { searchQuery: string }) {
  const { state, moveTaskToDay } = useApp();
  const { tasks, currentUser } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  if (!currentUser) return null;

  const now = new Date();
  const mondayBase = getMondayOfWeek(now);
  const monday = addDays(mondayBase, weekOffset * 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekDayStrs = weekDays.map(toISODateStr);

  const myTasks = (currentUser.role === 'director'
    ? tasks.filter(t => !['closed', 'completed'].includes(t.status))
    : tasks.filter(t =>
        (t.assignedTo === currentUser.id || t.transferredTo === currentUser.id) &&
        !['closed'].includes(t.status)
      )
  ).filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q);
  });

  // Unplanned tasks (no plannedDate or plannedDate not in this week)
  const unplanned = myTasks.filter(t => !t.plannedDate || !weekDayStrs.includes(t.plannedDate));

  // Tasks grouped by planned day
  const tasksByDay: Record<string, Task[]> = {};
  weekDayStrs.forEach(ds => { tasksByDay[ds] = []; });
  myTasks.forEach(t => {
    if (t.plannedDate && weekDayStrs.includes(t.plannedDate)) {
      tasksByDay[t.plannedDate].push(t);
    }
  });

  function handleDragStart(e: React.DragEvent, task: Task) {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: React.DragEvent, targetDay: string) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      moveTaskToDay(taskId, targetDay);
    }
    setDragOverDay(null);
  }

  function handleDropUnplanned(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      moveTaskToDay(taskId, '');
    }
    setDragOverDay(null);
  }

  const todayStr = toISODateStr(now);

  return (
    <div className="week-planner-root" style={{ padding: '16px 16px', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 700, color: '#111' }}>📅 Планер недели</h1>
          <div style={{ fontSize: 12, color: '#888' }}>
            {toDateStr(monday)} — {toDateStr(addDays(monday, 6))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: 13 }}
          >←</button>
          <button
            onClick={() => setWeekOffset(0)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #BE185D', background: weekOffset === 0 ? '#BE185D' : '#fff', color: weekOffset === 0 ? '#fff' : '#BE185D', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >Сегодня</button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: 13 }}
          >→</button>
        </div>
      </div>

      {/* Unplanned strip (horizontal on mobile) */}
      <div
        className="week-unplanned-strip"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropUnplanned}
        style={{
          background: '#FAFAF8', borderRadius: 10,
          border: '1.5px dashed #D1D5DB',
          marginBottom: 10, flexShrink: 0,
        }}
      >
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555', flexShrink: 0 }}>📋 Незапланированные ({unplanned.length})</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }}>
            {unplanned.length === 0
              ? <div style={{ fontSize: 11, color: '#ccc' }}>Все задачи запланированы 🎉</div>
              : unplanned.slice(0, MAX_UNPLANNED_DISPLAY).map(t => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={e => handleDragStart(e, t)}
                  onClick={() => setSelectedTask(t)}
                  style={{
                    background: '#fff', borderRadius: 6, padding: '4px 8px',
                    border: '1px solid #E8E8E8', cursor: 'grab', fontSize: 11,
                    whiteSpace: 'nowrap', flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  {t.title.length > 22 ? t.title.slice(0, 22) + '…' : t.title}
                </div>
              ))
            }
            {unplanned.length > MAX_UNPLANNED_DISPLAY && (
              <div style={{ fontSize: 11, color: '#999', alignSelf: 'center', flexShrink: 0 }}>+{unplanned.length - MAX_UNPLANNED_DISPLAY} ещё</div>
            )}
          </div>
        </div>
      </div>

      {/* Week columns — horizontally scrollable on mobile */}
      <div className="week-columns-wrapper" style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: 6, height: '100%', minWidth: 0 }}>
          {weekDays.map((dayDate, i) => {
            const dayStr = weekDayStrs[i];
            const isToday = dayStr === todayStr;
            const dayTasks = tasksByDay[dayStr] ?? [];
            const isOver = dragOverDay === dayStr;

            return (
              <div
                key={dayStr}
                onDragOver={e => { e.preventDefault(); setDragOverDay(dayStr); }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={e => handleDrop(e, dayStr)}
                style={{
                  borderRadius: 10,
                  border: isOver ? '2px solid #BE185D' : `1.5px solid ${isToday ? '#BE185D' : '#E8E8E8'}`,
                  background: isOver ? '#FFF0F7' : isToday ? '#FFF0F7' : '#fff',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  transition: 'all 0.15s',
                  minWidth: 0,
                }}
              >
                {/* Day header */}
                <div style={{
                  padding: '8px 10px', borderBottom: '1px solid #F0F0F0',
                  background: isToday ? '#BE185D' : '#FAFAF8',
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#fff' : '#333' }}>{DAY_NAMES[i]}</div>
                  <div style={{ fontSize: 11, color: isToday ? 'rgba(255,255,255,0.8)' : '#999', marginTop: 1 }}>
                    {dayDate.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit' })}
                    {dayTasks.length > 0 && <span style={{ marginLeft: 4, background: isToday ? 'rgba(255,255,255,0.3)' : '#E8E8E8', color: isToday ? '#fff' : '#666', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{dayTasks.length}</span>}
                  </div>
                </div>

                {/* Tasks */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
                  {dayTasks.length === 0
                    ? <div style={{ fontSize: 11, color: '#DDD', textAlign: 'center', padding: '12px 4px' }}>Нет задач</div>
                    : dayTasks.map(t => (
                      <MiniTaskCard key={t.id} task={t} onClick={setSelectedTask} onDragStart={handleDragStart} />
                    ))
                  }
                </div>

                {/* Drop hint */}
                {isOver && (
                  <div style={{ padding: '6px', textAlign: 'center', fontSize: 11, color: '#BE185D', borderTop: '1px solid #FBCFE8', background: '#FFF0F7', flexShrink: 0 }}>
                    Бросить сюда
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="week-legend" style={{ marginTop: 8, display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: '#aaa', flexShrink: 0, flexWrap: 'wrap' }}>
        <span>💡 Перетаскивайте задачи между днями</span>
        <span className="week-legend-sep">•</span>
        <span>Всего: {myTasks.length} задач</span>
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
