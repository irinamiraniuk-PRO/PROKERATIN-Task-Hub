import { useState } from 'react';
import { useApp } from '../context/useApp';
import type { Task, TaskStatus } from '../types';
import TaskModal from './TaskModal';
import { STATUS_LABELS, statusColor, priorityColor, isOverdue } from '../utils/taskCardUtils';

interface KanbanColumn {
  status: TaskStatus;
  emoji: string;
  color: string;
}

const COLUMNS: KanbanColumn[] = [
  { status: 'new', emoji: '🆕', color: '#6366F1' },
  { status: 'accepted', emoji: '✅', color: '#0891B2' },
  { status: 'in_progress', emoji: '▶️', color: '#1D4ED8' },
  { status: 'waiting_response', emoji: '⏳', color: '#F97316' },
  { status: 'transferred', emoji: '📤', color: '#7C3AED' },
  { status: 'pending_director_review', emoji: '🔍', color: '#D97706' },
  { status: 'returned_for_revision', emoji: '↩️', color: '#EF4444' },
  { status: 'completed', emoji: '🏁', color: '#059669' },
  { status: 'closed', emoji: '🔒', color: '#374151' },
  { status: 'overdue', emoji: '⚠️', color: '#B91C1C' },
  { status: 'postponed', emoji: '⏸️', color: '#6B7280' },
];

interface KanbanCardProps {
  task: Task;
  onClick: (t: Task) => void;
  onDragStart: (e: React.DragEvent, t: Task) => void;
}

function KanbanCard({ task, onClick, onDragStart }: KanbanCardProps) {
  const { state } = useApp();
  const pc = priorityColor(task.priority);
  const sc = statusColor(task.status);
  const overdue = isOverdue(task.deadline) && !['completed', 'closed'].includes(task.status);
  const assignee = state.users.find(u => u.id === task.assignedTo);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onClick={() => onClick(task)}
      style={{
        background: overdue ? '#FFF5F5' : '#fff',
        borderRadius: 9,
        padding: '10px 12px',
        border: `1px solid ${overdue ? '#FCA5A5' : '#EBEBEB'}`,
        borderLeft: `3px solid ${pc}`,
        cursor: 'grab',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'transform 0.1s, box-shadow 0.1s',
        marginBottom: 6,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: '#111', lineHeight: 1.35, marginBottom: 6 }}>
        {task.title.length > 55 ? task.title.slice(0, 55) + '…' : task.title}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#F3F4F6', color: '#555', fontWeight: 600 }}>
              #{tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#F3F4F6', color: '#888' }}>+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: sc.bg, color: sc.text }}>
          {STATUS_LABELS[task.status]}
        </span>
        <span style={{ fontSize: 10, color: overdue ? '#B91C1C' : '#999', fontWeight: overdue ? 700 : 400 }}>
          {overdue ? '⚠️ ' : ''}{new Date(task.deadline).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit' })}
        </span>
      </div>

      {assignee && (
        <div style={{ marginTop: 5, fontSize: 10, color: '#888' }}>
          👤 {assignee.name.split(' ')[0]}
        </div>
      )}
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  searchQuery?: string;
}

export default function KanbanBoard({ tasks, searchQuery = '' }: KanbanBoardProps) {
  const { kanbanMove, state } = useApp();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const filtered = tasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (t.title.toLowerCase().includes(q)) return true;
    if (t.description.toLowerCase().includes(q)) return true;
    if (t.comments.some(c => c.text.toLowerCase().includes(q))) return true;
    if (t.tags?.some(tag => tag.toLowerCase().includes(q))) return true;
    const assignee = state.users.find(u => u.id === t.assignedTo);
    if (assignee?.name.toLowerCase().includes(q)) return true;
    return false;
  });

  const tasksByStatus: Record<TaskStatus, Task[]> = {} as Record<TaskStatus, Task[]>;
  COLUMNS.forEach(col => { tasksByStatus[col.status] = []; });
  filtered.forEach(t => {
    if (tasksByStatus[t.status]) tasksByStatus[t.status].push(t);
  });

  function handleDragStart(e: React.DragEvent, task: Task) {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      kanbanMove(taskId, status);
    }
    setDragOverCol(null);
  }

  const isEmpty = COLUMNS.every(col => tasksByStatus[col.status].length === 0);

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, minHeight: 'calc(100vh - 130px)' }}>
      {isEmpty && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#bbb', fontSize: 14, flex: 1 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          Нет задач для отображения
        </div>
      )}
      {COLUMNS.map(col => {
        const colTasks = tasksByStatus[col.status];
        const isOver = dragOverCol === col.status;

        return (
          <div
            key={col.status}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.status); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, col.status)}
            style={{
              minWidth: 220,
              maxWidth: 240,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              background: isOver ? `${col.color}08` : '#F9F9F8',
              borderRadius: 12,
              border: isOver ? `2px solid ${col.color}` : '2px solid transparent',
              transition: 'all 0.15s',
              overflow: 'hidden',
            }}
          >
            {/* Column header */}
            <div style={{
              padding: '10px 12px',
              borderBottom: `2px solid ${col.color}30`,
              background: `${col.color}10`,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: col.color, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{col.emoji}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {STATUS_LABELS[col.status]}
                  </span>
                </div>
                {colTasks.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                    background: col.color, color: '#fff', minWidth: 18, textAlign: 'center',
                  }}>
                    {colTasks.length}
                  </span>
                )}
              </div>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px', minHeight: 80 }}>
              {colTasks.length === 0 ? (
                <div style={{
                  textAlign: 'center', fontSize: 11, color: isOver ? col.color : '#DDD',
                  padding: '16px 4px', fontStyle: 'italic',
                  borderRadius: 8, border: isOver ? `1px dashed ${col.color}` : '1px dashed #E8E8E8',
                }}>
                  {isOver ? 'Бросить сюда' : 'Нет задач'}
                </div>
              ) : (
                colTasks.map(t => (
                  <KanbanCard
                    key={t.id}
                    task={t}
                    onClick={setSelectedTask}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
              {isOver && colTasks.length > 0 && (
                <div style={{
                  textAlign: 'center', fontSize: 11, color: col.color,
                  padding: '8px 4px', borderRadius: 8, border: `1px dashed ${col.color}`,
                  marginTop: 4,
                }}>
                  Бросить сюда
                </div>
              )}
            </div>
          </div>
        );
      })}

      {selectedTask && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
