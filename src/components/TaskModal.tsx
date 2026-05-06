import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Task, TaskTag, User } from '../types';
import { STATUS_LABELS, PRIORITY_LABELS, statusColor, priorityColor, formatDate } from './TaskCard';
import { ALL_TAGS } from '../data/taskTags';
import { isStuck, isWaitingTooLong, isPendingReviewTooLong, isReactionOverdue, lastActivityDate, hoursSince } from '../utils/taskAlerts';
import AIAssistantModal from './AIAssistantModal';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
}

// Render comment text with @mention highlights
function CommentText({ text, users, currentUserId }: { text: string; users: User[]; currentUserId: string }) {
  const parts = text.split(/(@[А-Яа-яЁёA-Za-z0-9]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const word = part.slice(1);
          const user = users.find(u => {
            const p = u.name.split(' ');
            return p[0] === word || u.name === word;
          });
          const isMe = user?.id === currentUserId;
          return (
            <span key={i} style={{
              background: isMe ? '#DBEAFE' : '#F3F4F6',
              color: isMe ? '#1D4ED8' : '#374151',
              borderRadius: 4,
              padding: '0 3px',
              fontWeight: 600,
              fontSize: '0.95em',
            }}>
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function getFileIcon(mimeType: string, isLink?: boolean): string {
  if (isLink) return '🔗';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  ) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType === 'text/plain') return '📝';
  return '📎';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const MAX_FILE_BYTES = 300 * 1024; // 300 KB limit for localStorage safety

export default function TaskModal({ task, onClose }: TaskModalProps) {
  const {
    state, updateStatus, transferTask, sendToDirectorReview,
    addComment, directorAction, setPlannedDate, updateDeadline,
    toggleChecklistItem, addChecklistItem, updateChecklistItemAssignee,
    updateTaskTags, addAttachment,
  } = useApp();
  const { currentUser, users } = state;
  const [comment, setComment] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [showReturn, setShowReturn] = useState(false);
  const [showPlannedDate, setShowPlannedDate] = useState(false);
  const [newPlannedDate, setNewPlannedDate] = useState(task.plannedDate ?? '');
  const [showDeadline, setShowDeadline] = useState(false);
  const [newDeadline, setNewDeadline] = useState(task.deadline.slice(0, 10));
  const [newCheckItem, setNewCheckItem] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'comments' | 'history' | 'checklist' | 'files'>('info');
  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  // Files tab
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [fileError, setFileError] = useState('');
  // Checklist assignee picker: itemId being edited
  const [assigneePickerItemId, setAssigneePickerItemId] = useState<string | null>(null);
  // AI Assistant
  const [showAI, setShowAI] = useState(false);

  if (!currentUser) return null;

  const sc = statusColor(task.status);
  const pc = priorityColor(task.priority);
  const assignee = users.find(u => u.id === task.assignedTo);
  const creator = users.find(u => u.id === task.createdBy);
  const transferredToUser = task.transferredTo ? users.find(u => u.id === task.transferredTo) : null;

  const isDirector = currentUser.role === 'director';
  const isAssignee = task.assignedTo === currentUser.id;
  const isTransferredToMe = task.transferredTo === currentUser.id && task.status === 'transferred';
  const returnNoteValid = returnNote.trim().length > 0;
  const canAct = isAssignee || isDirector || isTransferredToMe;

  const otherUsers = users.filter(u => u.id !== currentUser.id);

  function handleTransfer() {
    if (!selectedUser) return;
    transferTask(task.id, selectedUser);
    setShowTransfer(false);
    onClose();
  }

  function handleDirectorReturn() {
    if (!returnNoteValid) return;
    directorAction(task.id, 'return', returnNote);
    setShowReturn(false);
    onClose();
  }

  function handlePlannedDate() {
    if (!newPlannedDate) return;
    setPlannedDate(task.id, newPlannedDate);
    setShowPlannedDate(false);
  }

  function handleDeadlineUpdate() {
    if (!newDeadline) return;
    updateDeadline(task.id, newDeadline + 'T23:59:59.000Z');
    setShowDeadline(false);
  }

  function handleAddCheckItem() {
    if (!newCheckItem.trim()) return;
    addChecklistItem(task.id, newCheckItem.trim());
    setNewCheckItem('');
  }

  // @mention autocomplete
  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setComment(val);
    const match = val.match(/@([А-Яа-яЁёA-Za-z0-9]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(user: User) {
    const firstName = user.name.split(' ')[0];
    const newText = comment.replace(/@([А-Яа-яЁёA-Za-z0-9]*)$/, `@${firstName} `);
    setComment(newText);
    setMentionQuery(null);
    commentRef.current?.focus();
  }

  const mentionSuggestions = mentionQuery !== null
    ? users.filter(u =>
        u.id !== currentUser?.id &&
        u.name.split(' ')[0].toLowerCase().startsWith(mentionQuery.toLowerCase())
      )
    : [];

  // Files
  function handleAddLink() {
    if (!linkUrl.trim()) return;
    const name = linkName.trim() || linkUrl.trim();
    addAttachment(task.id, { name, mimeType: 'text/uri-list', url: linkUrl.trim(), isLink: true });
    setLinkName('');
    setLinkUrl('');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(''); // clear any previous error
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`Файл слишком большой (макс. ${formatFileSize(MAX_FILE_BYTES)}). Используйте ссылку для больших файлов.`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      addAttachment(task.id, { name: file.name, mimeType: file.type, url, size: file.size });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const actions: { label: string; onClick: () => void; color?: string; show: boolean }[] = [
    {
      label: '✅ Принять',
      show: canAct && task.status === 'new',
      onClick: () => { updateStatus(task.id, 'accepted'); onClose(); },
      color: '#10B981',
    },
    {
      label: '▶️ Взять в работу',
      show: canAct && (task.status === 'accepted' || task.status === 'returned_for_revision'),
      onClick: () => { updateStatus(task.id, 'in_progress'); onClose(); },
      color: '#4A90D9',
    },
    {
      label: '📤 Передать',
      show: (isAssignee || isDirector || isTransferredToMe) && !['completed', 'closed', 'pending_director_review'].includes(task.status),
      onClick: () => setShowTransfer(true),
      color: '#7C3AED',
    },
    {
      label: '⏳ Жду ответа',
      show: (isAssignee || isTransferredToMe) && ['in_progress', 'accepted'].includes(task.status),
      onClick: () => { updateStatus(task.id, 'waiting_response'); onClose(); },
      color: '#F97316',
    },
    {
      label: '🔍 На проверку директору',
      show: (isAssignee || isTransferredToMe) && ['in_progress', 'accepted', 'returned_for_revision'].includes(task.status) && !isDirector,
      onClick: () => { sendToDirectorReview(task.id); onClose(); },
      color: '#D97706',
    },
    {
      label: '🏁 Выполнено',
      show: canAct && ['in_progress', 'accepted', 'returned_for_revision'].includes(task.status),
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
    {
      label: '📅 Запланировать дату',
      show: canAct && !['completed', 'closed'].includes(task.status),
      onClick: () => setShowPlannedDate(true),
      color: '#0891B2',
    },
    {
      label: '📆 Изменить дедлайн',
      show: isDirector && !['completed', 'closed'].includes(task.status),
      onClick: () => setShowDeadline(true),
      color: '#6366F1',
    },
  ];

  const userColor = currentUser.color ?? '#BE185D';

  const tabStyle = (tab: typeof activeTab): React.CSSProperties => ({
    padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    borderBottom: activeTab === tab ? `2px solid ${userColor}` : '2px solid transparent',
    color: activeTab === tab ? userColor : '#666', background: 'none',
  });

  const checklist = task.checklist ?? [];
  const doneCount = checklist.filter(i => i.done).length;

  return (
    <div className="modal-overlay-mobile" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-fullscreen-mobile" style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: sc.bg, color: sc.text }}>
                  {STATUS_LABELS[task.status]}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: `${pc}20`, color: pc }}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
                {task.plannedDate && (
                  <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 9px', borderRadius: 6, background: '#E0F2FE', color: '#0369A1' }}>
                    📅 Запланировано: {new Date(task.plannedDate).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit' })}
                  </span>
                )}
                {(task.tags ?? []).map(tag => (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: '#F3F4F6', color: '#555' }}>
                    #{tag}
                  </span>
                ))}
                {task.recurrence && task.recurrence !== 'none' && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: '#FEF3C7', color: '#92400E' }}>
                    🔁 {task.recurrence === 'daily' ? 'Каждый день' : task.recurrence === 'weekly' ? 'Каждую неделю' : task.recurrence === 'monthly' ? 'Каждый месяц' : `Каждые ${task.recurrenceCustomDays ?? 7} дн.`}
                  </span>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{task.title}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setShowAI(true)}
                style={{
                  padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #7C3AED, #BE185D)',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 5,
                  whiteSpace: 'nowrap', transition: 'opacity 0.15s',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                title="AI-помощник"
              >
                🤖 Помочь с задачей
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', flexShrink: 0 }}>✕</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', padding: '0 28px', flexShrink: 0, overflowX: 'auto' }}>
          <button style={tabStyle('info')} onClick={() => setActiveTab('info')}>Информация</button>
          <button style={tabStyle('comments')} onClick={() => setActiveTab('comments')}>
            Комментарии {task.comments.length > 0 && `(${task.comments.length})`}
          </button>
          <button style={tabStyle('checklist')} onClick={() => setActiveTab('checklist')}>
            Чек-лист {checklist.length > 0 && `(${doneCount}/${checklist.length})`}
          </button>
          <button style={tabStyle('files')} onClick={() => setActiveTab('files')}>
            Файлы {(task.attachments?.length ?? 0) > 0 && `(${task.attachments!.length})`}
          </button>
          <button style={tabStyle('history')} onClick={() => setActiveTab('history')}>История</button>
        </div>

        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1, overflowY: 'auto' }}>

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Описание</div>
                <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Исполнитель', value: assignee?.name ?? '—' },
                  { label: 'Постановщик', value: creator?.name ?? '—' },
                  { label: 'Дедлайн', value: formatDate(task.deadline) },
                  { label: 'Создана', value: formatDate(task.createdAt) },
                  ...(task.reactionDeadline ? [{ label: '📩 Срок реакции', value: new Date(task.reactionDeadline) <= new Date() ? `⚠️ ${new Date(task.reactionDeadline).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit' })} (истёк)` : new Date(task.reactionDeadline).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric' }) }] : []),
                  ...(task.plannedDate ? [{ label: 'Запланировано', value: new Date(task.plannedDate).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric' }) }] : []),
                  ...(transferredToUser ? [{ label: 'Передана', value: transferredToUser.name }] : []),
                  ...(task.sentToDirectorAt ? [{ label: 'Отправлено директору', value: new Date(task.sentToDirectorAt).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk' }) }] : []),
                ].map(m => (
                  <div key={m.label} style={{ background: '#FAFAF8', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{m.label}</div>
                    <div style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Alert banners */}
              {(() => {
                const stuck = isStuck(task);
                const waitingLong = isWaitingTooLong(task);
                const pendingLong = isPendingReviewTooLong(task);
                const reactionExpired = isReactionOverdue(task) && !['completed', 'closed'].includes(task.status);
                const lastAct = lastActivityDate(task);
                const hoursAgo = Math.floor(hoursSince(lastAct));
                const alerts: { bg: string; border: string; color: string; icon: string; text: string }[] = [];
                if (stuck) alerts.push({ bg: '#F9FAFB', border: '#E5E7EB', color: '#6B7280', icon: '😴', text: `Нет движения ${hoursAgo >= 72 ? `${Math.floor(hoursAgo / 24)} дн.` : `${hoursAgo} ч.`} — задача зависла` });
                if (waitingLong) alerts.push({ bg: '#FFF7ED', border: '#FDBA74', color: '#C2410C', icon: '⏳', text: 'Ждём ответ более 24 часов' });
                if (pendingLong) {
                  const since = task.sentToDirectorAt ? new Date(task.sentToDirectorAt) : lastAct;
                  const days = Math.floor(hoursSince(since) / 24);
                  alerts.push({ bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: '🔍', text: `На проверке директора уже ${days} ${days === 1 ? 'день' : 'дня'}` });
                }
                if (reactionExpired) alerts.push({ bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C', icon: '📩', text: 'Срок реакции истёк' });
                if (alerts.length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alerts.map((a, i) => (
                      <div key={i} style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{a.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: a.color }}>{a.text}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Tags */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Теги</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {ALL_TAGS.map(tag => {
                    const active = (task.tags ?? []).includes(tag as TaskTag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          const current = task.tags ?? [];
                          const next = active ? current.filter(t => t !== tag) : [...current, tag as TaskTag];
                          updateTaskTags(task.id, next);
                        }}
                        style={{
                          padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          border: `1.5px solid ${active ? userColor : '#E0E0E0'}`,
                          background: active ? `${userColor}15` : '#FAFAF8',
                          color: active ? userColor : '#777',
                          transition: 'all 0.12s',
                        }}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
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
                    {otherUsers.map(u => <option key={u.id} value={u.id}>{u.name} {u.role === 'director' ? '(Директор)' : ''}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleTransfer} disabled={!selectedUser} style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none', cursor: selectedUser ? 'pointer' : 'not-allowed',
                      background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, opacity: selectedUser ? 1 : 0.5,
                    }}>Передать</button>
                    <button onClick={() => setShowTransfer(false)} style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid #DDD', cursor: 'pointer', background: '#fff', fontSize: 13,
                    }}>Отмена</button>
                  </div>
                </div>
              )}

              {/* Return for revision form */}
              {showReturn && (
                <div style={{ background: '#FFF5F5', borderRadius: 10, padding: 16, border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Причина возврата на доработку (обязательно):</div>
                  <textarea
                    value={returnNote}
                    onChange={e => setReturnNote(e.target.value)}
                    placeholder="Укажите, что нужно исправить..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #DDD', fontSize: 13, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={handleDirectorReturn} disabled={!returnNoteValid} style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      cursor: returnNoteValid ? 'pointer' : 'not-allowed',
                      background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 600,
                      opacity: returnNoteValid ? 1 : 0.5,
                    }}>Вернуть</button>
                    <button onClick={() => setShowReturn(false)} style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid #DDD', cursor: 'pointer', background: '#fff', fontSize: 13,
                    }}>Отмена</button>
                  </div>
                </div>
              )}

              {/* Set planned date */}
              {showPlannedDate && (
                <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 16, border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Дата планирования:</div>
                  <input type="date" value={newPlannedDate} onChange={e => setNewPlannedDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #DDD', fontSize: 13, marginBottom: 10, display: 'block' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handlePlannedDate} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#0891B2', color: '#fff', fontSize: 13, fontWeight: 600 }}>Сохранить</button>
                    <button onClick={() => setShowPlannedDate(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #DDD', cursor: 'pointer', background: '#fff', fontSize: 13 }}>Отмена</button>
                  </div>
                </div>
              )}

              {/* Update deadline */}
              {showDeadline && (
                <div style={{ background: '#F5F3FF', borderRadius: 10, padding: 16, border: '1px solid #DDD6FE' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Новый дедлайн:</div>
                  <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #DDD', fontSize: 13, marginBottom: 10, display: 'block' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleDeadlineUpdate} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#6366F1', color: '#fff', fontSize: 13, fontWeight: 600 }}>Сохранить</button>
                    <button onClick={() => setShowDeadline(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #DDD', cursor: 'pointer', background: '#fff', fontSize: 13 }}>Отмена</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {[...task.comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(c => {
                  const author = users.find(u => u.id === c.authorId);
                  const isMe = c.authorId === currentUser!.id;
                  const mentionsMe = c.mentions?.includes(currentUser!.id);
                  return (
                    <div key={c.id} style={{
                      background: mentionsMe ? '#FFF0F5' : isMe ? '#EFF6FF' : '#FAFAF8',
                      borderRadius: 8, padding: '10px 14px',
                      border: `1px solid ${mentionsMe ? '#FBCFE8' : isMe ? '#BFDBFE' : '#EBEBEB'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: isMe ? '#1D4ED8' : '#444' }}>
                            {author?.name ?? 'Неизвестно'} {isMe ? '(Вы)' : ''}
                          </span>
                          {mentionsMe && (
                            <span style={{ fontSize: 10, background: '#BE185D', color: '#fff', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
                              упомянули вас
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: '#aaa' }}>
                          {new Date(c.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>
                        <CommentText text={c.text} users={users} currentUserId={currentUser!.id} />
                      </div>
                    </div>
                  );
                })}
                {task.comments.length === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>Комментариев пока нет</div>}
              </div>

              {/* Comment input with @mention */}
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                  Используйте @Имя для упоминания пользователя
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    ref={commentRef}
                    value={comment}
                    onChange={handleCommentChange}
                    placeholder="Написать комментарий... (@Имя для упоминания)"
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, resize: 'none', minHeight: 70, outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = userColor)}
                    onBlur={e => {
                      e.target.style.borderColor = '#E0E0E0';
                      // delay closing so click on suggestion registers
                      setTimeout(() => setMentionQuery(null), 150);
                    }}
                  />
                  <button onClick={() => { addComment(task.id, comment.trim()); setComment(''); setMentionQuery(null); }} disabled={!comment.trim()} style={{
                    padding: '0 16px', borderRadius: 8, border: 'none', cursor: comment.trim() ? 'pointer' : 'not-allowed',
                    background: userColor, color: '#fff', fontSize: 13, fontWeight: 600, opacity: comment.trim() ? 1 : 0.5, alignSelf: 'stretch',
                  }}>
                    Отправить
                  </button>
                </div>

                {/* @mention suggestions dropdown */}
                {mentionSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                    background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    border: '1px solid #E0E0E0', overflow: 'hidden', zIndex: 10,
                    minWidth: 180,
                  }}>
                    {mentionSuggestions.map(u => (
                      <div
                        key={u.id}
                        onMouseDown={() => insertMention(u)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F9FF')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: u.color ?? '#888', color: '#fff',
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {u.name[0]}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.name.split(' ')[0]}</span>
                        <span style={{ color: '#999', fontSize: 11 }}>{u.name.split(' ').slice(1).join(' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <div>
              {checklist.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>
                      {doneCount} из {checklist.length} выполнено
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: doneCount === checklist.length ? '#10B981' : userColor }}>
                      {checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0}%
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0}%`, background: doneCount === checklist.length ? '#10B981' : userColor, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {checklist.map(item => {
                  const itemAssignee = item.assignedTo ? users.find(u => u.id === item.assignedTo) : null;
                  const isPickingAssignee = assigneePickerItemId === item.id;
                  return (
                    <div key={item.id}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderRadius: 8, background: item.done ? '#F0FDF4' : '#FAFAF8',
                        border: `1px solid ${item.done ? '#BBF7D0' : '#EBEBEB'}`,
                      }}>
                        {/* Checkbox */}
                        <div
                          onClick={() => toggleChecklistItem(task.id, item.id)}
                          style={{
                            width: 18, height: 18, borderRadius: 4, border: `2px solid ${item.done ? '#10B981' : '#DDD'}`,
                            background: item.done ? '#10B981' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.15s', cursor: 'pointer',
                          }}
                        >
                          {item.done && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
                        </div>
                        {/* Text */}
                        <span
                          onClick={() => toggleChecklistItem(task.id, item.id)}
                          style={{ flex: 1, fontSize: 13, color: item.done ? '#666' : '#222', textDecoration: item.done ? 'line-through' : 'none', cursor: 'pointer' }}
                        >
                          {item.text}
                        </span>
                        {/* Assignee avatar / assign button */}
                        {itemAssignee ? (
                          <button
                            onClick={() => setAssigneePickerItemId(isPickingAssignee ? null : item.id)}
                            title={`Исполнитель: ${itemAssignee.name}`}
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: itemAssignee.color ?? '#888', color: '#fff',
                              fontSize: 9, fontWeight: 800, border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {itemAssignee.name[0]}
                          </button>
                        ) : canAct ? (
                          <button
                            onClick={() => setAssigneePickerItemId(isPickingAssignee ? null : item.id)}
                            title="Назначить исполнителя"
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: '#F3F4F6', color: '#888',
                              fontSize: 12, border: '1px dashed #CCC', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            👤
                          </button>
                        ) : null}
                      </div>
                      {/* Assignee picker dropdown */}
                      {isPickingAssignee && (
                        <div style={{
                          marginTop: 2, marginLeft: 40, background: '#fff', borderRadius: 8,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0',
                          overflow: 'hidden', zIndex: 10,
                        }}>
                          <div
                            onClick={() => { updateChecklistItemAssignee(task.id, item.id, undefined); setAssigneePickerItemId(null); }}
                            style={{ padding: '8px 12px', fontSize: 12, color: '#888', cursor: 'pointer', borderBottom: '1px solid #F0F0F0' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                          >
                            Без исполнителя
                          </div>
                          {users.map(u => (
                            <div
                              key={u.id}
                              onClick={() => { updateChecklistItemAssignee(task.id, item.id, u.id); setAssigneePickerItemId(null); }}
                              style={{
                                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: item.assignedTo === u.id ? '#EFF6FF' : '#fff',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#F0F9FF')}
                              onMouseLeave={e => (e.currentTarget.style.background = item.assignedTo === u.id ? '#EFF6FF' : '#fff')}
                            >
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%',
                                background: u.color ?? '#888', color: '#fff',
                                fontSize: 9, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {u.name[0]}
                              </div>
                              <span style={{ fontWeight: item.assignedTo === u.id ? 700 : 400 }}>{u.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {checklist.length === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>Чек-лист пуст</div>}
              </div>
              {canAct && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={newCheckItem}
                    onChange={e => setNewCheckItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCheckItem()}
                    placeholder="Добавить пункт..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = userColor)}
                    onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                  />
                  <button onClick={handleAddCheckItem} disabled={!newCheckItem.trim()} style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    cursor: newCheckItem.trim() ? 'pointer' : 'not-allowed',
                    background: userColor, color: '#fff', fontSize: 13, fontWeight: 600,
                    opacity: newCheckItem.trim() ? 1 : 0.5,
                  }}>+ Добавить</button>
                </div>
              )}
            </div>
          )}

          {/* FILES TAB */}
          {activeTab === 'files' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                Файлы и материалы
              </div>

              {/* Existing attachments */}
              {(task.attachments ?? []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {task.attachments!.map(att => {
                    const uploader = users.find(u => u.id === att.uploadedBy);
                    return (
                      <div key={att.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 8,
                        background: '#FAFAF8', border: '1px solid #EBEBEB',
                      }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{getFileIcon(att.mimeType, att.isLink)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {att.isLink ? (
                            <a href={att.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {att.name}
                            </a>
                          ) : (
                            <a href={att.url} download={att.name} style={{ fontSize: 13, fontWeight: 600, color: '#111', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {att.name}
                            </a>
                          )}
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                            {uploader?.name ?? '—'} · {new Date(att.uploadedAt).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {att.size !== undefined && ` · ${formatFileSize(att.size)}`}
                          </div>
                        </div>
                        {!att.isLink && (
                          <a href={att.url} download={att.name} style={{ fontSize: 11, color: '#4A90D9', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                            ⬇️ Скачать
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>Файлов пока нет</div>
              )}

              {/* Add link */}
              <div style={{ background: '#F8F8F8', borderRadius: 10, padding: 14, border: '1px solid #EBEBEB', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Добавить ссылку</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={linkName}
                    onChange={e => setLinkName(e.target.value)}
                    placeholder="Название ссылки (необязательно)"
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = userColor)}
                    onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, outline: 'none' }}
                      onFocus={e => (e.target.style.borderColor = userColor)}
                      onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                      onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                    />
                    <button onClick={handleAddLink} disabled={!linkUrl.trim()} style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      cursor: linkUrl.trim() ? 'pointer' : 'not-allowed',
                      background: '#4A90D9', color: '#fff', fontSize: 13, fontWeight: 600,
                      opacity: linkUrl.trim() ? 1 : 0.5,
                    }}>
                      + Ссылка
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload file */}
              <div style={{ background: '#F8F8F8', borderRadius: 10, padding: 14, border: '1px solid #EBEBEB' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Загрузить файл
                </div>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
                  Изображения, PDF, документы, таблицы — максимум {formatFileSize(MAX_FILE_BYTES)}
                </div>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8, border: '1.5px solid #E0E0E0',
                  cursor: 'pointer', background: '#fff', fontSize: 13, fontWeight: 600, color: '#555',
                }}>
                  📎 Выбрать файл
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </label>
                {fileError && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#B91C1C', background: '#FEE2E2', borderRadius: 6, padding: '6px 10px' }}>
                    {fileError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...task.history].reverse().map(h => {
                const actor = users.find(u => u.id === h.actorId);
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, background: '#FAFAF8' }}>
                    <span style={{ color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 12 }}>
                      {new Date(h.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ fontWeight: 600, color: '#555', flexShrink: 0, fontSize: 12 }}>{actor?.name ?? h.actorId}</span>
                    <span style={{ fontSize: 12, color: '#666' }}>— {h.action}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showAI && <AIAssistantModal task={task} onClose={() => setShowAI(false)} />}
    </div>
  );
}
