import type { Task } from '../types';

/** Returns true when at least one dependency task is not completed/closed. */
export function isTaskBlocked(task: Task, allTasks: Task[]): boolean {
  if (!task.dependsOn || task.dependsOn.length === 0) return false;
  return task.dependsOn.some(depId => {
    const dep = allTasks.find(t => t.id === depId);
    if (!dep) return false; // dep deleted — don't block
    return !['completed', 'closed'].includes(dep.status);
  });
}

/** Returns the tasks that are currently blocking this task. */
export function getBlockingTasks(task: Task, allTasks: Task[]): Task[] {
  if (!task.dependsOn || task.dependsOn.length === 0) return [];
  return task.dependsOn
    .map(depId => allTasks.find(t => t.id === depId))
    .filter((t): t is Task => !!t && !['completed', 'closed'].includes(t.status));
}

/** Returns the tasks that this task is blocking (i.e. tasks that depend on this task). */
export function getTasksBlockedBy(task: Task, allTasks: Task[]): Task[] {
  return allTasks.filter(t => t.dependsOn?.includes(task.id));
}
