import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import { STATUS_LABELS, PRIORITY_LABELS, statusColor, priorityColor, formatDate } from './TaskCard';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
}

export default function TaskModal({ task, onClose }: TaskModalProps) {
  const { state, updateStatus, transferTask, sendToDirectorReview, addComment, directorAction } = useApp();
  const { currentUser, users } = state;
  const [comment, setComment] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [showReturn, setShowReturn] = useState(false);

  if (!currentUser) return null;

  const sc = statusColor(task.status);
  const pc = priorityColor(task.priority);
  const assignee = users.find(u => u.id === task.assignedTo);
  const creator = users.find(u => u.id === task.createdBy);
  const transferredToUser = task.transferredTo ? users.find(u => u.id === task.transferredTo) : null;

  const isDirector = currentUser.role === 'director';
  const isAssignee = task.assignedTo === currentUser.id;
  const canAct = isAssignee || isDirector;

  const otherUsers = users.filter(u => u.id !== currentUser.id);

  function handleComment() {
    if (!comment.trim()) return;
    addComment(task.id, comment.trim());
    setComment('');
  }

  function handleTransfer() {
    if (!selectedUser) return;
    transferTask(task.id, selectedUser);
    setShowTransfer(false);
    onClose();
  }

  function handleDirectorReturn() {
    directorAction(task.id, 'return', returnNote);
    setShowReturn(false);
    onClose();
  }

  const actions: { label: string; onClick: () => void; color?: string; show: boolean }[] = [
    {
      label: '✅ Принять',
      show: canAct && task.status === 'new',
      onClick: () => { updateStatus(task.id, 'accepted'); onClose(); },
      color: '#10B981',
    },
    {
      label: '▶️ Начать работу',
      show: canAct && task.status === 'accepted',
      onClick: () => { updateStatus(task.id, 'in_progress'); onClose(); },
      color: '#4A90D9',
    },
    {
      label: '📤 Передать',
      show: (isAssignee || isDirector) && !['completed', 'closed', 'pending_director_review'].includes(task.status),
      onClick: () => setShowTransfer(true),
      color: '#7C3AED',
    },
    {
      label: '🔍 На проверку директору',
      show: isAssignee && task.status === 'in_progress' && !isDirector,
      onClick: () => { sendToDirectorReview(task.id); onClose(); },
      color: '#D97706',
    },
    {
      label: '🏁 Выполнено',
      show: canAct && ['in_progress', 'accepted'].includes(task.status),
      onClick: () => { updateStatus(task.id, 'completed'); onClose(); },
      color: '#059669',
    },
    {
      label: '⏸️ Отложить',
      show: canAct && ['new', 'accepted', 'in_progress'].includes(task.status),
      onClick: () => { updateStatus(task.id, 'postponed'); onClose(); },
      color: '#6B7280',
    },
    {
      label: '✔️ Одобрить и закрыть',
      show: isDirector && task.status === 'pending_director_review',
      onClick: () => { directorAction(task.id, 'approve'); onClose(); },
      color: '#059669',
    },
    {
      label: '↩️ Вернуть на доработку',
      show: isDirector && task.status === 'pending_director_review',
      onClick: () => setShowReturn(true),
      color: '#EF4444',
    },
    {
      label: '🔒 Закрыть задачу',
      show: isDirector && task.status === 'completed',
      onClick: () => { updateStatus(task.id, 'closed'); onClose(); },
      color: '#374151',
    },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #F0F0F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: sc.bg, color: sc.text }}>
                  {STATUS_LABELS[task.status]}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: `${pc}20`, color: pc }}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{task.title}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', flexShrink: 0 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Description */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Описание</div>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</div>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Исполнитель', value: assignee?.name ?? '—' },
              { label: 'Создал', value: creator?.name ?? '—' },
              { label: 'Срок', value: formatDate(task.deadline) },
              { label: 'Создана', value: formatDate(task.createdAt) },
              ...(transferredToUser ? [{ label: 'Передана', value: transferredToUser.name }] : []),
            ].map(m => (
              <div key={m.label} style={{ background: '#FAFAF8', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{m.label}</div>
                <div style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          {actions.filter(a => a.show).length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Действия</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {actions.filter(a => a.show).map(a => (
                  <button key={a.label} onClick={a.onClick} style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: a.color ?? '#4A90D9', color: '#fff', fontSize: 13, fontWeight: 600,
                    transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transfer picker */}
          {showTransfer && (
            <div style={{ background: '#F8F8F8', borderRadius: 10, padding: 16, border: '1px solid #E8E8E8' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Выберите пользователя для передачи:</div>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #DDD', fontSize: 13, marginBottom: 10 }}
              >
                <option value="">— выберите —</option>
                {otherUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleTransfer} disabled={!selectedUser} style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: selectedUser ? 'pointer' : 'not-allowed',
                  background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, opacity: selectedUser ? 1 : 0.5,
                }}>Передать</button>
                <button onClick={() => setShowTransfer(false)} style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #DDD', cursor: 'pointer',
                  background: '#fff', fontSize: 13,
                }}>Отмена</button>
              </div>
            </div>
          )}

          {/* Return for revision form */}
          {showReturn && (
            <div style={{ background: '#FFF5F5', borderRadius: 10, padding: 16, border: '1px solid #FECACA' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Причина возврата на доработку:</div>
              <textarea
                value={returnNote}
                onChange={e => setReturnNote(e.target.value)}
                placeholder="Укажите, что нужно исправить..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #DDD', fontSize: 13, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={handleDirectorReturn} style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 600,
                }}>Вернуть</button>
                <button onClick={() => setShowReturn(false)} style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #DDD', cursor: 'pointer', background: '#fff', fontSize: 13,
                }}>Отмена</button>
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              Комментарии ({task.comments.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {task.comments.map(c => {
                const author = users.find(u => u.id === c.authorId);
                return (
                  <div key={c.id} style={{ background: '#FAFAF8', borderRadius: 8, padding: '10px 14px', border: '1px solid #EBEBEB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>{author?.name ?? 'Неизвестно'}</span>
                      <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(c.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                );
              })}
              {task.comments.length === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>Комментариев пока нет</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Написать комментарий..."
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0',
                  fontSize: 13, resize: 'none', minHeight: 60, outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
              <button onClick={handleComment} disabled={!comment.trim()} style={{
                padding: '0 16px', borderRadius: 8, border: 'none', cursor: comment.trim() ? 'pointer' : 'not-allowed',
                background: '#4A90D9', color: '#fff', fontSize: 13, fontWeight: 600,
                opacity: comment.trim() ? 1 : 0.5, alignSelf: 'stretch',
              }}>
                Отправить
              </button>
            </div>
          </div>

          {/* History */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              История
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...task.history].reverse().map(h => {
                const actor = users.find(u => u.id === h.actorId);
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: '#666' }}>
                    <span style={{ color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {new Date(h.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ fontWeight: 500, color: '#555', flexShrink: 0 }}>{actor?.name ?? h.actorId}</span>
                    <span>— {h.action}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
