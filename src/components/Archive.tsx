
import { useApp } from '../context/useApp';
import TaskListView from './TaskListView';

export default function Archive({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  if (!currentUser) return null;

  const archived = currentUser.role === 'director'
    ? tasks.filter(t => ['completed', 'closed'].includes(t.status))
    : tasks.filter(t =>
        ['completed', 'closed'].includes(t.status) &&
        (t.assignedTo === currentUser.id || t.createdBy === currentUser.id)
      );

  return (
    <TaskListView
      tasks={archived}
      title="Архив"
      emptyMessage="Архив пуст"
      searchQuery={searchQuery}
    />
  );
}
