import { useApp } from '../context/AppContext';
import type { Task, TaskStatus, TaskPriority } from '../types';
import { isStuck, isWaitingTooLong, isPendingReviewTooLong, isReactionOverdue } from '../utils/taskAlerts';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  accepted: 'Принята',
  in_progress: 'В работе',
  waiting_response: 'Ждём ответ',
  transferred: 'Передана',
  pending_director_review: 'На проверке у директора',
  returned_for_revision: 'Возвращена на доработку',
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
    case 'new': return { bg: '#F3F4F6', text: '#374151' };
    case 'accepted': return { bg: '#E0F2FE', text: '#0369A1' };
    case 'in_progress': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'waiting_response': return { bg: '#FED7AA', text: '#C2410C' };
    case 'transferred': return { bg: '#F3E8FF', text: '#7C3AED' };
    case 'pending_director_review': return { bg: '#FEF9C3', text: '#92400E' };
    case 'returned_for_revision': return { bg: '#FEE2E2', text: '#B91C1C' };
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
  if (task.status === 'returned_for_revision') return '#FFF5F5';
  if (task.status === 'completed' || task.status === 'closed') return '#F0FDF4';
  if (task.status === 'pending_director_review') return '#FFFBEB';
  if (task.status === 'waiting_response') return '#FFF7ED';
  if (task.status === 'in_progress') return '#EFF6FF';
  if (task.priority === 'urgent') return '#FFF5F5';
  return '#fff';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit' });
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
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
}

export default function TaskCard({ task, onClick, draggable, onDragStart }: TaskCardProps) {
  const { state } = useApp();
  const assignee = state.users.find(u => u.id === task.assignedTo);
  const creator = state.users.find(u => u.id === task.createdBy);
  const sc = statusColor(task.status);
  const pc = priorityColor(task.priority);
  const bg = cardBg(task);
  const deadlineSoon = isDeadlineSoon(task.deadline);
  const overdue = isOverdue(task.deadline) && !['completed', 'closed'].includes(task.status);

  const stuck = isStuck(task);
  const waitingLong = isWaitingTooLong(task);
  const pendingLong = isPendingReviewTooLong(task);
  const reactionExpired = isReactionOverdue(task) && !['completed', 'closed'].includes(task.status);

  const lastComment = task.comments.length > 0 ? task.comments[task.comments.length - 1] : null;
  const lastCommentAuthor = lastComment ? state.users.find(u => u.id === lastComment.authorId) : null;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart ? (e) => onDragStart(e, task) : undefined}
      onClick={() => onClick(task)}
      style={{
        background: bg, borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
        border: `1.5px solid ${task.status === 'returned_for_revision' ? '#FECACA' : task.priority === 'urgent' ? '#FECACA' : '#EBEBEB'}`,
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        borderLeft: `4px solid ${pc}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', lineHeight: 1.4, flex: 1 }}>{task.title}</div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
          background: sc.bg, color: sc.text, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#777', marginBottom: 8, lineHeight: 1.4 }}>
        {task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description}
      </div>

      {lastComment && (
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 11, color: '#666' }}>
          💬 <span style={{ fontWeight: 600 }}>{lastCommentAuthor?.name ?? '?'}</span>: {lastComment.text.length > 60 ? lastComment.text.slice(0, 60) + '…' : lastComment.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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

      {task.checklist && task.checklist.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
          ☑️ {task.checklist.filter(i => i.done).length}/{task.checklist.length} пунктов выполнено
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {task.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#F3F4F6', color: '#666', fontWeight: 600 }}>
              #{tag}
            </span>
          ))}
          {task.tags.length > 4 && (
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#F3F4F6', color: '#999' }}>+{task.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Alert badges */}
      {(stuck || waitingLong || pendingLong || reactionExpired) && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {stuck && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
              😴 Нет движения
            </span>
          )}
          {waitingLong && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: '#FED7AA', color: '#C2410C' }}>
              ⏳ Ждём {'>'}24 ч
            </span>
          )}
          {pendingLong && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: '#FEF9C3', color: '#92400E' }}>
              🔍 На проверке {'>'}2 дн
            </span>
          )}
          {reactionExpired && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: '#FEE2E2', color: '#B91C1C' }}>
              📩 Срок реакции истёк
            </span>
          )}
        </div>
      )}
    </div>
  );
}
