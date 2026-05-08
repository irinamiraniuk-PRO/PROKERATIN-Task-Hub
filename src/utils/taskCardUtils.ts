import type { Task, TaskPriority, TaskStatus } from '../types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  accepted: 'Принята',
  in_progress: 'В работе',
  waiting_response: 'Ждём ответ',
  transferred: 'Передана',
  pending_director_review: 'На проверке у директора',
  returned_for_revision: 'Возвращена на доработку',
  completed: 'Выполнена',
  closed: 'Закрыта',
  postponed: 'Отложена',
  overdue: 'Просрочена',
  blocked: 'Заблокирована',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочно',
};

export function statusColor(status: TaskStatus): { bg: string; text: string } {
  switch (status) {
    case 'new': return { bg: '#F3F4F6', text: '#374151' };
    case 'accepted': return { bg: '#E0F2FE', text: '#0369A1' };
    case 'in_progress': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'waiting_response': return { bg: '#FED7AA', text: '#C2410C' };
    case 'transferred': return { bg: '#F3E8FF', text: '#7C3AED' };
    case 'pending_director_review': return { bg: '#FEF9C3', text: '#92400E' };
    case 'returned_for_revision': return { bg: '#FEE2E2', text: '#B91C1C' };
    case 'completed': return { bg: '#D1FAE5', text: '#065F46' };
    case 'closed': return { bg: '#D1FAE5', text: '#065F46' };
    case 'postponed': return { bg: '#F3F4F6', text: '#4B5563' };
    case 'overdue': return { bg: '#FEE2E2', text: '#B91C1C' };
    default: return { bg: '#F3F4F6', text: '#374151' };
  }
}

export function priorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent': return '#EF4444';
    case 'high': return '#F97316';
    case 'medium': return '#F59E0B';
    case 'low': return '#6B7280';
    default: return '#6B7280';
  }
}

export function cardBg(task: Task): string {
  if (task.status === 'overdue') return '#FFF5F5';
  if (task.status === 'returned_for_revision') return '#FFF5F5';
  if (task.status === 'completed' || task.status === 'closed') return '#F0FDF4';
  if (task.status === 'pending_director_review') return '#FFFBEB';
  if (task.status === 'waiting_response') return '#FFF7ED';
  if (task.status === 'in_progress') return '#EFF6FF';
  if (task.priority === 'urgent') return '#FFF5F5';
  return '#fff';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit' });
}

export function isDeadlineSoon(iso: string): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 86400000 * 2;
}

export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
