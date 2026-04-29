import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import TaskListView from './TaskListView';

export default function MyTasks({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  if (!currentUser) return null;

  const isDirector = currentUser.role === 'director';

  const myTasks = isDirector
    ? tasks.filter(t => !['completed', 'closed'].includes(t.status))
    : tasks.filter(t =>
        (t.assignedTo === currentUser.id || t.transferredTo === currentUser.id) &&
        !['completed', 'closed'].includes(t.status)
      );

  // Show returned tasks highlighted at top for employees
  const returnedTasks = !isDirector ? myTasks.filter(t => t.status === 'returned_for_revision') : [];
  const otherTasks = !isDirector ? myTasks.filter(t => t.status !== 'returned_for_revision') : myTasks;

  if (!isDirector && returnedTasks.length > 0) {
    return (
      <div style={{ padding: '28px 28px', maxWidth: 900 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111' }}>Мои задачи</h1>
          <div style={{ fontSize: 13, color: '#888' }}>{myTasks.length} активных задач</div>
        </div>

        {/* Returned for revision alert */}
        <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#B91C1C', marginBottom: 12 }}>
            ↩️ Возвращено на доработку ({returnedTasks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {returnedTasks
              .filter(t => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return t.title.toLowerCase().includes(q);
              })
              .map(t => <TaskCard key={t.id} task={t} onClick={setSelectedTask} />)}
          </div>
        </div>

        <TaskListView
          tasks={otherTasks}
          title="Остальные задачи"
          emptyMessage="Нет других активных задач"
          searchQuery={searchQuery}
        />

        {selectedTask && (
          <TaskModal
            task={state.tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    );
  }

  return (
    <TaskListView
      tasks={myTasks}
      title="Мои задачи"
      emptyMessage="У вас нет активных задач"
      searchQuery={searchQuery}
    />
  );
}
