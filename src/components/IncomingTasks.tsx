
import { useApp } from '../context/AppContext';
import TaskListView from './TaskListView';

export default function IncomingTasks({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  if (!currentUser) return null;

  const incoming = tasks.filter(t =>
    t.transferredTo === currentUser.id && t.status === 'transferred'
  );

  return (
    <TaskListView
      tasks={incoming}
      title="Входящие задачи"
      emptyMessage="Нет входящих задач"
      searchQuery={searchQuery}
    />
  );
}
