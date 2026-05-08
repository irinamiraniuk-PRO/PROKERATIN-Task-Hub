import { useState } from 'react';
import { useApp } from '../context/useApp';
import type { Task, TaskStatus, TaskPriority, TaskTag } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import KanbanBoard from './KanbanBoard';
import { ALL_TAGS } from '../data/taskTags';

interface FilterState {
  status: TaskStatus | '';
  priority: TaskPriority | '';
  assignee: string;
  creator: string;
  tag: TaskTag | '';
  overdueOnly: boolean;
  pendingReviewOnly: boolean;
  deadlineFrom: string;
  deadlineTo: string;
  plannedFrom: string;
  plannedTo: string;
}

const EMPTY_FILTERS: FilterState = {
  status: '', priority: '', assignee: '', creator: '',
  tag: '', overdueOnly: false, pendingReviewOnly: false,
  deadlineFrom: '', deadlineTo: '', plannedFrom: '', plannedTo: '',
};

interface TaskListViewProps {
  tasks: Task[];
  title: string;
  emptyMessage?: string;
  searchQuery?: string;
  defaultMode?: 'list' | 'kanban';
  showModeSwitch?: boolean;
}

const STATUS_OPTIONS: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'Все статусы' },
  { value: 'new', label: 'Новая' },
  { value: 'accepted', label: 'Принята' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'waiting_response', label: 'Ждём ответ' },
  { value: 'transferred', label: 'Передана' },
  { value: 'pending_director_review', label: 'На проверке' },
  { value: 'returned_for_revision', label: 'На доработку' },
  { value: 'completed', label: 'Выполнена' },
  { value: 'closed', label: 'Закрыта' },
  { value: 'postponed', label: 'Отложена' },
  { value: 'overdue', label: 'Просрочена' },
];

const PRIORITY_OPTIONS: { value: TaskPriority | ''; label: string }[] = [
  { value: '', label: 'Все приоритеты' },
  { value: 'urgent', label: '🔴 Срочно' },
  { value: 'high', label: '🟠 Высокий' },
  { value: 'medium', label: '🟡 Средний' },
  { value: 'low', label: '⚪ Низкий' },
];

export default function TaskListView({
  tasks, title, emptyMessage = 'Задач нет', searchQuery = '',
  defaultMode = 'list', showModeSwitch = true,
}: TaskListViewProps) {
  const { state } = useApp();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'createdAt'>('deadline');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [mode, setMode] = useState<'list' | 'kanban'>(defaultMode);
  const [showFilters, setShowFilters] = useState(false);

  const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  const hasActiveFilters = !!(
    filters.status || filters.priority || filters.assignee || filters.creator ||
    filters.tag || filters.overdueOnly || filters.pendingReviewOnly ||
    filters.deadlineFrom || filters.deadlineTo || filters.plannedFrom || filters.plannedTo
  );

  const filtered = tasks
    .filter(t => {
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.assignee && t.assignedTo !== filters.assignee) return false;
      if (filters.creator && t.createdBy !== filters.creator) return false;
      if (filters.tag && !t.tags?.includes(filters.tag)) return false;
      if (filters.overdueOnly && !(t.status === 'overdue' || new Date(t.deadline) < new Date())) return false;
      if (filters.pendingReviewOnly && t.status !== 'pending_director_review') return false;
      if (filters.deadlineFrom && new Date(t.deadline) < new Date(filters.deadlineFrom)) return false;
      if (filters.deadlineTo && new Date(t.deadline) > new Date(filters.deadlineTo + 'T23:59:59')) return false;
      if (filters.plannedFrom && t.plannedDate && t.plannedDate < filters.plannedFrom) return false;
      if (filters.plannedTo && t.plannedDate && t.plannedDate > filters.plannedTo) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = t.description.toLowerCase().includes(q);
        const inComments = t.comments.some(c => c.text.toLowerCase().includes(q));
        const inTags = t.tags?.some(tag => tag.toLowerCase().includes(q));
        const assigneeUser = state.users.find(u => u.id === t.assignedTo);
        const inAssignee = assigneeUser?.name.toLowerCase().includes(q);
        const creatorUser = state.users.find(u => u.id === t.createdBy);
        const inCreator = creatorUser?.name.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inComments && !inTags && !inAssignee && !inCreator) return false;
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

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E8E8E8',
    fontSize: 12, background: '#FAFAF8', outline: 'none', color: '#444',
  };

  const modeBtn = (m: 'list' | 'kanban', icon: string, label: string) => (
    <button
      onClick={() => setMode(m)}
      style={{
        padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: mode === m ? 700 : 400, display: 'flex', alignItems: 'center', gap: 5,
        background: mode === m ? '#BE185D' : '#F3F4F6',
        color: mode === m ? '#fff' : '#555',
        transition: 'all 0.15s',
      }}
    >
      <span>{icon}</span>{label}
    </button>
  );

  return (
    <div style={{ padding: '20px 24px', maxWidth: mode === 'kanban' ? '100%' : 960 }}>
      {/* Title + mode switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#111' }}>{title}</h1>
          <div style={{ fontSize: 12, color: '#888' }}>
            {filtered.length} задач{filtered.length !== tasks.length ? ` из ${tasks.length}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {showModeSwitch && (
            <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 10, padding: 3 }}>
              {modeBtn('list', '☰', 'Список')}
              {modeBtn('kanban', '⬛', 'Канбан')}
            </div>
          )}
          <button
            onClick={() => setShowFilters(f => !f)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${hasActiveFilters ? '#BE185D' : '#E8E8E8'}`,
              background: hasActiveFilters ? '#FFF0F6' : '#fff',
              color: hasActiveFilters ? '#BE185D' : '#555',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span>⚙️</span>
            Фильтры{hasActiveFilters ? ' ●' : ''}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              style={{ ...selectStyle, background: '#FEE2E2', color: '#B91C1C', border: '1.5px solid #FECACA' }}
            >
              ✕ Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{
          background: '#FAFAF8', borderRadius: 12, padding: '16px 18px',
          border: '1.5px solid #EBEBEB', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Фильтры
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Статус</div>
              <select style={selectStyle} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as TaskStatus | '' }))}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Приоритет</div>
              <select style={selectStyle} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value as TaskPriority | '' }))}>
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Исполнитель</div>
              <select style={selectStyle} value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))}>
                <option value="">Все</option>
                {state.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Постановщик</div>
              <select style={selectStyle} value={filters.creator} onChange={e => setFilters(f => ({ ...f, creator: e.target.value }))}>
                <option value="">Все</option>
                {state.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Тег</div>
              <select style={selectStyle} value={filters.tag} onChange={e => setFilters(f => ({ ...f, tag: e.target.value as TaskTag | '' }))}>
                <option value="">Все теги</option>
                {ALL_TAGS.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Сортировка</div>
              <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value as 'deadline' | 'priority' | 'createdAt')}>
                <option value="deadline">По сроку</option>
                <option value="priority">По приоритету</option>
                <option value="createdAt">По дате создания</option>
              </select>
            </div>
          </div>

          {/* Date range filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Дедлайн от</div>
              <input type="date" style={inputStyle} value={filters.deadlineFrom}
                onChange={e => setFilters(f => ({ ...f, deadlineFrom: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Дедлайн до</div>
              <input type="date" style={inputStyle} value={filters.deadlineTo}
                onChange={e => setFilters(f => ({ ...f, deadlineTo: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Запланировано от</div>
              <input type="date" style={inputStyle} value={filters.plannedFrom}
                onChange={e => setFilters(f => ({ ...f, plannedFrom: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Запланировано до</div>
              <input type="date" style={inputStyle} value={filters.plannedTo}
                onChange={e => setFilters(f => ({ ...f, plannedTo: e.target.value }))} />
            </div>

            {/* Quick filters */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', color: filters.overdueOnly ? '#B91C1C' : '#555' }}>
                <input
                  type="checkbox"
                  checked={filters.overdueOnly}
                  onChange={e => setFilters(f => ({ ...f, overdueOnly: e.target.checked }))}
                  style={{ cursor: 'pointer' }}
                />
                ⚠️ Только просроченные
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', color: filters.pendingReviewOnly ? '#D97706' : '#555' }}>
                <input
                  type="checkbox"
                  checked={filters.pendingReviewOnly}
                  onChange={e => setFilters(f => ({ ...f, pendingReviewOnly: e.target.checked }))}
                  style={{ cursor: 'pointer' }}
                />
                🔍 Только на проверке
              </label>
            </div>
          </div>
        </div>
      )}

      {/* View content */}
      {mode === 'kanban' ? (
        <KanbanBoard tasks={filtered} />
      ) : (
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#aaa', fontSize: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            {hasActiveFilters || searchQuery ? 'Нет задач по выбранным фильтрам' : emptyMessage}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(t => (
              <TaskCard key={t.id} task={t} onClick={setSelectedTask} />
            ))}
          </div>
        )
      )}

      {selectedTask && mode === 'list' && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
