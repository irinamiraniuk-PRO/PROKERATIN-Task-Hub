import { useState } from 'react';
import { useApp } from '../context/useApp';
import type { TaskPriority, TaskTag, RecurrenceType } from '../types';
import { ALL_TAGS } from '../data/taskTags';
import { TASK_TEMPLATES } from '../data/taskTemplates';

interface CreateTaskModalProps {
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
  { value: 'urgent', label: 'Срочно' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Не повторять' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
  { value: 'custom', label: 'Свой вариант' },
];

export default function CreateTaskModal({ onClose }: CreateTaskModalProps) {
  const { state, createTask } = useApp();
  const { users, currentUser } = state;

  const today = new Date().toISOString().slice(0, 10);

  // Template picker state
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(currentUser?.id ?? '');
  const [deadline, setDeadline] = useState(today);
  const [plannedDate, setPlannedDate] = useState(today);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [selectedTags, setSelectedTags] = useState<TaskTag[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceCustomDays, setRecurrenceCustomDays] = useState(7);
  const [reactionType, setReactionType] = useState<'none' | 'today' | '24h' | 'custom'>('none');
  const [reactionCustomDate, setReactionCustomDate] = useState(today);
  const [error, setError] = useState('');

  function applyTemplate(templateId: string) {
    const tpl = TASK_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    setTitle(tpl.name);
    setDescription(tpl.description);
    setPriority(tpl.priority);
    setSelectedTags(tpl.tags);
    setChecklistItems([...tpl.checklist]);
    setSelectedTemplate(templateId);
    setShowTemplates(false);
  }

  function startBlank() {
    setShowTemplates(false);
    setSelectedTemplate(null);
  }

  function toggleTag(tag: TaskTag) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  function addCheckItem() {
    if (!newCheckItem.trim()) return;
    setChecklistItems(prev => [...prev, newCheckItem.trim()]);
    setNewCheckItem('');
  }

  function removeCheckItem(index: number) {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Введите название задачи'); return; }
    if (!assignedTo) { setError('Выберите исполнителя'); return; }
    if (!deadline) { setError('Укажите срок'); return; }

    let reactionDeadline: string | undefined;
    if (reactionType === 'today') {
      const d = new Date(); d.setHours(23, 59, 59, 0);
      reactionDeadline = d.toISOString();
    } else if (reactionType === '24h') {
      reactionDeadline = new Date(Date.now() + 86_400_000).toISOString();
    } else if (reactionType === 'custom' && reactionCustomDate) {
      reactionDeadline = reactionCustomDate + 'T23:59:59.000Z';
    }

    createTask({
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      deadline: deadline + 'T23:59:59.000Z',
      priority,
      plannedDate: plannedDate || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      checklist: checklistItems.length > 0 ? checklistItems : undefined,
      recurrence,
      recurrenceCustomDays: recurrence === 'custom' ? recurrenceCustomDays : undefined,
      reactionDeadline,
    });
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #E0E0E0', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#555',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  return (
    <div className="modal-overlay-mobile" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-fullscreen-mobile" style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {showTemplates ? '📋 Выберите шаблон или создайте задачу' : (() => {
              const tpl = TASK_TEMPLATES.find(t => t.id === selectedTemplate);
              return tpl ? `${tpl.emoji} Из шаблона: ${tpl.name}` : 'Создать задачу';
            })()}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        {/* TEMPLATE PICKER */}
        {showTemplates ? (
          <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
              Выберите шаблон для быстрого создания задачи:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {TASK_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  style={{
                    padding: '14px 16px', borderRadius: 10, border: '1.5px solid #E8E8E8',
                    cursor: 'pointer', background: '#FAFAF8', textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: 4,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A90D9'; e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E8E8'; e.currentTarget.style.background = '#FAFAF8'; }}
                >
                  <div style={{ fontSize: 22 }}>{tpl.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{tpl.checklist.length} пунктов чек-листа</div>
                </button>
              ))}
            </div>
            <button
              onClick={startBlank}
              style={{
                marginTop: 4, padding: '12px 16px', borderRadius: 10, border: '1.5px dashed #CCCCCC',
                cursor: 'pointer', background: '#fff', fontSize: 13, fontWeight: 600, color: '#888',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#888'; e.currentTarget.style.color = '#444'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#CCCCCC'; e.currentTarget.style.color = '#888'; }}
            >
              ✏️ Создать задачу с нуля
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Back to templates */}
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              style={{ alignSelf: 'flex-start', fontSize: 12, color: '#4A90D9', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: 600 }}
            >
              ← Выбрать другой шаблон
            </button>

            <div>
              <label style={labelStyle}>Название *</label>
              <input
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setError(''); }}
                placeholder="Краткое название задачи"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
            </div>

            <div>
              <label style={labelStyle}>Описание</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Подробное описание задачи..."
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
                onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Исполнитель *</label>
                <select
                  value={assignedTo}
                  onChange={e => { setAssignedTo(e.target.value); setError(''); }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                  onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} {u.role === 'director' ? '(Директор)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Приоритет</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                  onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Дедлайн *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => { setDeadline(e.target.value); setError(''); }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                  onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                />
              </div>

              <div>
                <label style={labelStyle}>Запланировать на</label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={e => setPlannedDate(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                  onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                />
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label style={labelStyle}>🔁 Повторять</label>
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as RecurrenceType)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              >
                {RECURRENCE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {recurrence === 'custom' && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#555' }}>Каждые</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={recurrenceCustomDays}
                    onChange={e => setRecurrenceCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: 64, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                    onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                  />
                  <span style={{ fontSize: 13, color: '#555' }}>дней</span>
                </div>
              )}
            </div>

            {/* Reaction deadline */}
            <div>
              <label style={labelStyle}>📩 Срок реакции</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {([
                  { value: 'none', label: 'Не указан' },
                  { value: 'today', label: 'Сегодня' },
                  { value: '24h', label: 'В течение 24 часов' },
                  { value: 'custom', label: 'Конкретная дата' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReactionType(opt.value)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${reactionType === opt.value ? '#F97316' : '#E0E0E0'}`,
                      background: reactionType === opt.value ? '#FFF7ED' : '#FAFAF8',
                      color: reactionType === opt.value ? '#C2410C' : '#777',
                      transition: 'all 0.12s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {reactionType === 'custom' && (
                <input
                  type="date"
                  value={reactionCustomDate}
                  onChange={e => setReactionCustomDate(e.target.value)}
                  style={{ ...inputStyle, marginTop: 8 }}
                  onFocus={e => (e.target.style.borderColor = '#F97316')}
                  onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                />
              )}
            </div>

            {/* Tags */}
            <div>
              <label style={labelStyle}>Теги {selectedTags.length > 0 && `(${selectedTags.length} выбрано)`}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ALL_TAGS.map(tag => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${active ? '#4A90D9' : '#E0E0E0'}`,
                        background: active ? '#EFF6FF' : '#FAFAF8',
                        color: active ? '#1D4ED8' : '#777',
                        transition: 'all 0.12s',
                      }}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist */}
            <div>
              <label style={labelStyle}>
                Чек-лист {checklistItems.length > 0 && `(${checklistItems.length} пунктов)`}
              </label>
              {checklistItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {checklistItems.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      borderRadius: 6, background: '#FAFAF8', border: '1px solid #EBEBEB',
                    }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid #DDD', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: '#333' }}>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeCheckItem(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                        title="Удалить пункт"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(); } }}
                  placeholder="Добавить пункт чек-листа..."
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                  onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                />
                <button
                  type="button"
                  onClick={addCheckItem}
                  disabled={!newCheckItem.trim()}
                  style={{
                    padding: '10px 14px', borderRadius: 8, border: 'none',
                    cursor: newCheckItem.trim() ? 'pointer' : 'not-allowed',
                    background: '#10B981', color: '#fff', fontSize: 13, fontWeight: 600,
                    opacity: newCheckItem.trim() ? 1 : 0.5,
                  }}
                >
                  + Добавить
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button type="button" onClick={onClose} style={{
                padding: '10px 20px', borderRadius: 8, border: '1.5px solid #DDD', cursor: 'pointer',
                background: '#fff', fontSize: 14, fontWeight: 500, color: '#555',
              }}>
                Отмена
              </button>
              <button type="submit" style={{
                padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#4A90D9', color: '#fff', fontSize: 14, fontWeight: 600,
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#357ABD')}
                onMouseLeave={e => (e.currentTarget.style.background = '#4A90D9')}
              >
                Создать задачу
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
