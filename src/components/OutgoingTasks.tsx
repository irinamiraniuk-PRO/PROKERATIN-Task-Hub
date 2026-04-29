
import { useApp } from '../context/AppContext';
import TaskListView from './TaskListView';

export default function OutgoingTasks({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  if (!currentUser) return null;

  const outgoing = tasks.filter(t =>
    t.transferredFrom === currentUser.id && ['transferred', 'waiting_response'].includes(t.status)
  );

  return (
    <TaskListView
      tasks={outgoing}
      title="Исходящие задачи"
      emptyMessage="Нет исходящих задач"
      searchQuery={searchQuery}
    />
  );
}
