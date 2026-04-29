import { useApp } from '../context/AppContext';
import TaskListView from './TaskListView';

export default function OutgoingTasks({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  if (!currentUser) return null;

  // Outgoing: tasks I created and assigned to others, or tasks I transferred
  const outgoing = tasks.filter(t => {
    if (t.transferredFrom === currentUser.id) return true;
    if (t.createdBy === currentUser.id && t.assignedTo !== currentUser.id && !['completed', 'closed'].includes(t.status)) return true;
    return false;
  });

  return (
    <TaskListView
      tasks={outgoing}
      title="Исходящие задачи"
      emptyMessage="Нет исходящих задач"
      searchQuery={searchQuery}
    />
  );
}
