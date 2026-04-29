import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task, TaskStatus, TaskPriority } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

interface FilterState {
  status: TaskStatus | '';
  priority: TaskPriority | '';
  assignee: string;
}

interface TaskListViewProps {
  tasks: Task[];
  title: string;
  emptyMessage?: string;
  searchQuery?: string;
}

const STATUS_OPTIONS: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'Все статусы' },
  { value: 'new', label: 'Новая' },
  { value: 'accepted', label: 'Принята' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'waiting_response', label: 'Ожидание' },
  { value: 'transferred', label: 'Передана' },
  { value: 'pending_director_review', label: 'На проверке' },
  { value: 'completed', label: 'Выполнена' },
  { value: 'closed', label: 'Закрыта' },
  { value: 'postponed', label: 'Отложена' },
  { value: 'overdue', label: 'Просрочена' },
];

const PRIORITY_OPTIONS: { value: TaskPriority | ''; label: string }[] = [
  { value: '', label: 'Все приоритеты' },
  { value: 'urgent', label: 'Срочно' },
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low', label: 'Низкий' },
];

export default function TaskListView({ tasks, title, emptyMessage = 'Задач нет', searchQuery = '' }: TaskListViewProps) {
  const { state } = useApp();
  const [filters, setFilters] = useState<FilterState>({ status: '', priority: '', assignee: '' });
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'createdAt'>('deadline');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  const filtered = tasks
    .filter(t => {
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.assignee && t.assignedTo !== filters.assignee) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sortBy === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8E8E8',
    fontSize: 12, background: '#FAFAF8', cursor: 'pointer', outline: 'none', color: '#444',
  };

  return (
    <div style={{ padding: '28px 28px', maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111' }}>{title}</h1>
        <div style={{ fontSize: 13, color: '#888' }}>{filtered.length} задач{filtered.length !== tasks.length ? ` из ${tasks.length}` : ''}</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={selectStyle} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as TaskStatus | '' }))}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select style={selectStyle} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value as TaskPriority | '' }))}>
          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select style={selectStyle} value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))}>
          <option value="">Все исполнители</option>
          {state.users.filter(u => u.role === 'employee').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value as 'deadline' | 'priority' | 'createdAt')}>
          <option value="deadline">По сроку</option>
          <option value="priority">По приоритету</option>
          <option value="createdAt">По дате создания</option>
        </select>
        {(filters.status || filters.priority || filters.assignee) && (
          <button
            onClick={() => setFilters({ status: '', priority: '', assignee: '' })}
            style={{ ...selectStyle, background: '#FEE2E2', color: '#B91C1C', border: '1.5px solid #FECACA', cursor: 'pointer' }}
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Task grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#aaa', fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} onClick={setSelectedTask} />
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
