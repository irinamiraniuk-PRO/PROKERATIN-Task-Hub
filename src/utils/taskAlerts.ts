import type { Task, User } from '../types';

const TZ = 'Europe/Minsk';

export const STUCK_HOURS = 72; // 3 days → "Нет движения"
export const WAITING_TOO_LONG_HOURS = 24; // waiting_response > 24h → highlight
export const PENDING_REVIEW_TOO_LONG_HOURS = 48; // pending_director_review > 48h → soft yellow
export const OVERLOAD_THRESHOLD = 8; // employee active tasks considered overload

export function lastActivityDate(task: Task): Date {
  let latest = new Date(task.createdAt);
  for (const h of task.history) {
    const d = new Date(h.createdAt);
    if (d > latest) latest = d;
  }
  for (const c of task.comments) {
    const d = new Date(c.createdAt);
    if (d > latest) latest = d;
  }
  return latest;
}

export function hoursSince(date: Date): number {
  return (Date.now() - date.getTime()) / 3_600_000;
}

/** Task has had no activity for more than 3 days (and is still active). */
export function isStuck(task: Task): boolean {
  if (['completed', 'closed', 'postponed'].includes(task.status)) return false;
  return hoursSince(lastActivityDate(task)) > STUCK_HOURS;
}

/** Task is in waiting_response status for more than 24 h. */
export function isWaitingTooLong(task: Task): boolean {
  if (task.status !== 'waiting_response') return false;
  return hoursSince(lastActivityDate(task)) > WAITING_TOO_LONG_HOURS;
}

/** Task has been pending director review for more than 48 h. */
export function isPendingReviewTooLong(task: Task): boolean {
  if (task.status !== 'pending_director_review') return false;
  const since = task.sentToDirectorAt
    ? new Date(task.sentToDirectorAt)
    : lastActivityDate(task);
  return hoursSince(since) > PENDING_REVIEW_TOO_LONG_HOURS;
}

/** True when the reactionDeadline is overdue. */
export function isReactionOverdue(task: Task): boolean {
  if (!task.reactionDeadline) return false;
  return new Date(task.reactionDeadline) < new Date();
}

export interface SmartHint {
  id: string;
  emoji: string;
  text: string;
  type: 'danger' | 'warning' | 'info';
  taskId?: string;
}

export function getSmartHints(
  tasks: Task[],
  users: User[],
  currentUserId: string,
  isDirector: boolean,
): SmartHint[] {
  const hints: SmartHint[] = [];
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: TZ });

  const myTasks = isDirector
    ? tasks
    : tasks.filter(t =>
        t.assignedTo === currentUserId ||
        t.createdBy === currentUserId ||
        t.transferredTo === currentUserId,
      );
  const activeTasks = myTasks.filter(
    t => !['completed', 'closed'].includes(t.status),
  );

  // ── Overdue ──────────────────────────────────────────────────────────────
  const overdueTasks = activeTasks.filter(
    t => new Date(t.deadline) < now,
  );
  if (overdueTasks.length > 0) {
    const n = overdueTasks.length;
    hints.push({
      id: 'overdue',
      emoji: '🔥',
      text: `Просрочено ${n} ${n === 1 ? 'задача' : n < 5 ? 'задачи' : 'задач'} — требуется срочное действие`,
      type: 'danger',
    });
  }

  // ── Stuck tasks ───────────────────────────────────────────────────────────
  const stuckTasks = activeTasks.filter(isStuck);
  if (stuckTasks.length > 0) {
    hints.push({
      id: 'stuck',
      emoji: '😴',
      text:
        stuckTasks.length === 1
          ? `«${stuckTasks[0].title}» — нет движения больше 3 дней`
          : `${stuckTasks.length} ${stuckTasks.length < 5 ? 'задачи' : 'задач'} без движения больше 3 дней`,
      type: 'warning',
    });
  }

  // ── Waiting too long (per task) ───────────────────────────────────────────
  const waitingLong = activeTasks.filter(isWaitingTooLong);
  waitingLong.forEach(t => {
    hints.push({
      id: `waiting-${t.id}`,
      emoji: '⏳',
      text: `«${t.title}» — ждём ответа больше 24 часов`,
      type: 'warning',
      taskId: t.id,
    });
  });

  // ── Pending director review too long (per task) ───────────────────────────
  const pendingLong = activeTasks.filter(isPendingReviewTooLong);
  pendingLong.forEach(t => {
    const since = t.sentToDirectorAt
      ? new Date(t.sentToDirectorAt)
      : lastActivityDate(t);
    const days = Math.floor(hoursSince(since) / 24);
    const dayLabel = days === 1 ? '1 день' : `${days} дня`;
    hints.push({
      id: `pending-${t.id}`,
      emoji: '🔍',
      text: `«${t.title}» ждёт проверки директора уже ${dayLabel}`,
      type: 'info',
      taskId: t.id,
    });
  });

  // ── Reaction deadline overdue ─────────────────────────────────────────────
  const reactionOverdue = activeTasks.filter(isReactionOverdue);
  reactionOverdue.forEach(t => {
    hints.push({
      id: `reaction-${t.id}`,
      emoji: '📩',
      text: `«${t.title}» — истёк срок реакции`,
      type: 'danger',
      taskId: t.id,
    });
  });

  // ── Today overload for current user ──────────────────────────────────────
  const todayActiveTasks = activeTasks.filter(t => {
    const dl = new Date(t.deadline).toLocaleDateString('en-CA', { timeZone: TZ });
    const pl = t.plannedDate
      ? new Date(t.plannedDate).toLocaleDateString('en-CA', { timeZone: TZ })
      : null;
    return dl === todayStr || pl === todayStr;
  });
  if (todayActiveTasks.length >= 8) {
    hints.push({
      id: 'today-overload',
      emoji: '📊',
      text: `На сегодня запланировано слишком много задач: ${todayActiveTasks.length}`,
      type: 'warning',
    });
  }

  // ── Director: employee overload ───────────────────────────────────────────
  if (isDirector) {
    const employees = users.filter(u => u.role === 'employee');
    employees.forEach(emp => {
      const empActive = tasks.filter(
        t =>
          t.assignedTo === emp.id &&
          !['completed', 'closed'].includes(t.status),
      );
      if (empActive.length >= OVERLOAD_THRESHOLD) {
        hints.push({
          id: `overload-${emp.id}`,
          emoji: '👤',
          text: `У ${emp.name.split(' ')[0]} ${empActive.length} активных задач — возможен перегруз`,
          type: 'warning',
        });
      }
    });
  }

  return hints;
}
