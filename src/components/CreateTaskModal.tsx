import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { TaskPriority } from '../types';

interface CreateTaskModalProps {
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
  { value: 'urgent', label: 'Срочно' },
];

export default function CreateTaskModal({ onClose }: CreateTaskModalProps) {
  const { state, createTask } = useApp();
  const { users, currentUser } = state;

  const today = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(currentUser?.id ?? '');
  const [deadline, setDeadline] = useState(today);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [error, setError] = useState('');

  const availableUsers = currentUser?.role === 'director'
    ? users
    : users.filter(u => u.role === 'employee' || u.role === 'director');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Введите название задачи'); return; }
    if (!assignedTo) { setError('Выберите исполнителя'); return; }
    if (!deadline) { setError('Укажите срок'); return; }
    createTask({ title: title.trim(), description: description.trim(), assignedTo, deadline, priority });
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>Создать задачу</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              onFocus={e => (e.target.style.borderColor = '#4A90D9')}
              onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Исполнитель *</label>
              <select
                value={assignedTo}
                onChange={e => { setAssignedTo(e.target.value); setError(''); }}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => (e.target.style.borderColor = '#4A90D9')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              >
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
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

          <div>
            <label style={labelStyle}>Срок выполнения *</label>
            <input
              type="date"
              value={deadline}
              onChange={e => { setDeadline(e.target.value); setError(''); }}
              min={today}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => (e.target.style.borderColor = '#4A90D9')}
              onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
            />
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
      </div>
    </div>
  );
}
