
import { useApp } from '../context/AppContext';
import TaskListView from './TaskListView';

export default function MyTasks({ searchQuery }: { searchQuery: string }) {
  const { state } = useApp();
  const { tasks, currentUser } = state;
  if (!currentUser) return null;

  const myTasks = currentUser.role === 'director'
    ? tasks.filter(t => !['completed', 'closed'].includes(t.status))
    : tasks.filter(t => t.assignedTo === currentUser.id && !['completed', 'closed'].includes(t.status));

  return (
    <TaskListView
      tasks={myTasks}
      title="Мои задачи"
      emptyMessage="У вас нет активных задач"
      searchQuery={searchQuery}
    />
  );
}
