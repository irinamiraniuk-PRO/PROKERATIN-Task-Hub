import { useApp } from '../context/AppContext';
import type { Task, TaskStatus, TaskPriority } from '../types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  accepted: 'Принята',
  in_progress: 'В работе',
  waiting_response: 'Ожидание',
  transferred: 'Передана',
  pending_director_review: 'На проверке',
  completed: 'Выполнена',
  closed: 'Закрыта',
  postponed: 'Отложена',
  overdue: 'Просрочена',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочно',
};

export function statusColor(status: TaskStatus): { bg: string; text: string } {
  switch (status) {
    case 'new': return { bg: '#E8F0FE', text: '#3B5BDB' };
    case 'accepted': return { bg: '#E0F2FE', text: '#0369A1' };
    case 'in_progress': return { bg: '#FEF9C3', text: '#854D0E' };
    case 'waiting_response': return { bg: '#F3E8FF', text: '#7C3AED' };
    case 'transferred': return { bg: '#F3E8FF', text: '#7C3AED' };
    case 'pending_director_review': return { bg: '#FEF3C7', text: '#B45309' };
    case 'completed': return { bg: '#D1FAE5', text: '#065F46' };
    case 'closed': return { bg: '#D1FAE5', text: '#065F46' };
    case 'postponed': return { bg: '#F3F4F6', text: '#4B5563' };
    case 'overdue': return { bg: '#FEE2E2', text: '#B91C1C' };
    default: return { bg: '#F3F4F6', text: '#374151' };
  }
}

export function priorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent': return '#EF4444';
    case 'high': return '#F97316';
    case 'medium': return '#F59E0B';
    case 'low': return '#6B7280';
    default: return '#6B7280';
  }
}

export function cardBg(task: Task): string {
  if (task.status === 'overdue') return '#FFF5F5';
  if (task.status === 'completed' || task.status === 'closed') return '#F0FDF4';
  if (task.status === 'pending_director_review') return '#FFFBEB';
  if (task.priority === 'urgent') return '#FFF5F5';
  return '#fff';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function isDeadlineSoon(iso: string): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 86400000 * 2;
}

export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { state } = useApp();
  const assignee = state.users.find(u => u.id === task.assignedTo);
  const creator = state.users.find(u => u.id === task.createdBy);
  const sc = statusColor(task.status);
  const pc = priorityColor(task.priority);
  const bg = cardBg(task);
  const deadlineSoon = isDeadlineSoon(task.deadline);
  const overdue = isOverdue(task.deadline) && !['completed', 'closed'].includes(task.status);

  return (
    <div
      onClick={() => onClick(task)}
      style={{
        background: bg, borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
        border: `1.5px solid ${task.priority === 'urgent' ? '#FECACA' : '#EBEBEB'}`,
        transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        borderLeft: `4px solid ${pc}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', lineHeight: 1.4, flex: 1 }}>{task.title}</div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
          background: sc.bg, color: sc.text, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#777', marginBottom: 10, lineHeight: 1.4 }}>
        {task.description.length > 90 ? task.description.slice(0, 90) + '…' : task.description}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
            background: `${pc}20`, color: pc,
          }}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          {assignee && (
            <span style={{ fontSize: 11, color: '#666' }}>👤 {assignee.name}</span>
          )}
          {creator && creator.id !== assignee?.id && (
            <span style={{ fontSize: 11, color: '#aaa' }}>от {creator.name}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: overdue ? '#B91C1C' : deadlineSoon ? '#D97706' : '#888', fontWeight: overdue || deadlineSoon ? 600 : 400 }}>
          {overdue ? '⚠️ ' : deadlineSoon ? '⏰ ' : ''}{formatDate(task.deadline)}
        </div>
      </div>

      {task.comments.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
          💬 {task.comments.length} {task.comments.length === 1 ? 'комментарий' : 'комментария'}
        </div>
      )}
    </div>
  );
}
