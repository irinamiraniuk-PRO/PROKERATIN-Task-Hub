import { useApp } from '../context/useApp';
import type { Task } from '../types';
import { isStuck, isWaitingTooLong, isPendingReviewTooLong, isReactionOverdue } from '../utils/taskAlerts';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  statusColor,
  priorityColor,
  cardBg,
  formatDate,
  isDeadlineSoon,
  isOverdue,
} from '../utils/taskCardUtils';

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
        background: bg,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        border: `1px solid ${task.status === 'returned_for_revision' ? '#FECACA' : task.priority === 'urgent' ? '#FECACA' : '#EEECEA'}`,
        transition: 'box-shadow 0.18s, transform 0.18s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderLeft: `3px solid ${pc}`,
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = ''; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4, flex: 1, letterSpacing: '-0.1px' }}>{task.title}</div>
        <span style={{
          fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
          background: sc.bg, color: sc.text, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#9A9A9A', marginBottom: 8, lineHeight: 1.45 }}>
        {task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description}
      </div>

      {lastComment && (
        <div style={{ background: 'rgba(0,0,0,0.025)', borderRadius: 6, padding: '5px 9px', marginBottom: 8, fontSize: 11, color: '#7A7A7A' }}>
          💬 <span style={{ fontWeight: 600 }}>{lastCommentAuthor?.name ?? '?'}</span>: {lastComment.text.length > 60 ? lastComment.text.slice(0, 60) + '…' : lastComment.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
            background: `${pc}18`, color: pc,
          }}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          {assignee && (
            <span style={{ fontSize: 11, color: '#7A7A7A' }}>👤 {assignee.name}</span>
          )}
          {creator && creator.id !== assignee?.id && (
            <span style={{ fontSize: 11, color: '#C0BDB9' }}>от {creator.name}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: overdue ? '#EF4444' : deadlineSoon ? '#F59E0B' : '#ADADAD', fontWeight: overdue || deadlineSoon ? 600 : 400 }}>
          {overdue ? '⚠️ ' : deadlineSoon ? '⏰ ' : ''}{formatDate(task.deadline)}
        </div>
      </div>

      {task.checklist && task.checklist.length > 0 && (
        <div style={{ marginTop: 7, fontSize: 11, color: '#ADADAD' }}>
          ☑️ {task.checklist.filter(i => i.done).length}/{task.checklist.length} пунктов выполнено
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 7 }}>
          {task.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F1F0EE', color: '#7A7A7A', fontWeight: 500 }}>
              #{tag}
            </span>
          ))}
          {task.tags.length > 4 && (
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F1F0EE', color: '#ADADAD' }}>+{task.tags.length - 4}</span>
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
