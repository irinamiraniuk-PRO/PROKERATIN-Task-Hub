import { useApp } from '../context/useApp';
import TaskListView from './TaskListView';

export default function WaitingTasks({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  if (!currentUser) return null;

  const waiting = tasks.filter(t =>
    t.assignedTo === currentUser.id && t.status === 'waiting_response'
  );

  return (
    <TaskListView
      tasks={waiting}
      title="Жду ответ"
      emptyMessage="Нет задач в ожидании"
      searchQuery={searchQuery}
    />
  );
}
