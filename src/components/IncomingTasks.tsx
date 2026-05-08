import { useApp } from '../context/useApp';
import TaskListView from './TaskListView';

export default function IncomingTasks({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  if (!currentUser) return null;

  // Incoming: tasks transferred to me OR tasks assigned to me that are new
  const incoming = tasks.filter(t => {
    if (t.transferredTo === currentUser.id && t.status === 'transferred') return true;
    if (t.assignedTo === currentUser.id && t.status === 'new' && t.createdBy !== currentUser.id) return true;
    return false;
  });

  return (
    <TaskListView
      tasks={incoming}
      title="Входящие задачи"
      emptyMessage="Нет входящих задач"
      searchQuery={searchQuery}
    />
  );
}
