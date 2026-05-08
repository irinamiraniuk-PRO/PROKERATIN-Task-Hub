import { createContext, useContext, useReducer, useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  AppState, User, Task, TaskStatus, TaskPriority, TaskTag,
  Comment, HistoryEntry, ChecklistItem, Attachment, Notification, NotificationType,
  RecurrenceType, Project, Note, UserKBArticle, DashboardTodoItem,
} from '../types';
import { USERS, INITIAL_TASKS } from '../data/initialData';
import { INITIAL_PROJECTS } from '../data/initialProjects';
import { parseMentions } from '../utils/mentions';
import { createStateSyncAdapter, type SyncStatus } from '../utils/syncAdapter';

const LEGACY_LS_KEYS = ['prokeratin_state_v8', 'prokeratin_state_v7', 'prokeratin_state_v6'];
const STATE_EXPORT_VERSION = 1;
const stateSyncAdapter = createStateSyncAdapter();

type PersistedStateData = Partial<AppState> & { currentUserId?: string | null };
interface PersistedStatePayload {
  version: number;
  exportedAt: string;
  data: PersistedStateData;
}

type Action =
  | { type: 'HYDRATE_STATE'; state: AppState }
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'CREATE_TASK'; task: Task; notifications: Notification[] }
  | { type: 'UPDATE_STATUS'; taskId: string; status: TaskStatus; actorId: string; meta?: string; spawnedTask?: Task; spawnedNotifications?: Notification[] }
  | { type: 'TRANSFER_TASK'; taskId: string; toUserId: string; actorId: string; toUserName: string; notification?: Notification }
  | { type: 'ADD_COMMENT'; comment: Comment; taskId: string; actorId: string; notifications: Notification[] }
  | { type: 'DIRECTOR_ACTION'; taskId: string; action: 'approve' | 'return'; actorId: string; note?: string; notification?: Notification; spawnedTask?: Task; spawnedNotifications?: Notification[] }
  | { type: 'SET_PLANNED_DATE'; taskId: string; plannedDate: string }
  | { type: 'MOVE_TASK_TO_DAY'; taskId: string; plannedDate: string; actorId: string }
  | { type: 'UPDATE_DEADLINE'; taskId: string; deadline: string; actorId: string }
  | { type: 'TOGGLE_CHECKLIST_ITEM'; taskId: string; itemId: string }
  | { type: 'ADD_CHECKLIST_ITEM'; taskId: string; item: ChecklistItem }
  | { type: 'UPDATE_CHECKLIST_ITEM_ASSIGNEE'; taskId: string; itemId: string; assignedTo: string | undefined }
  | { type: 'SEND_TO_DIRECTOR'; taskId: string; actorId: string }
  | { type: 'UPDATE_TASK_TAGS'; taskId: string; tags: TaskTag[] }
  | { type: 'KANBAN_MOVE'; taskId: string; status: TaskStatus; actorId: string }
  | { type: 'ADD_ATTACHMENT'; attachment: Attachment; actorId: string }
  | { type: 'MARK_NOTIFICATION_READ'; notificationId: string }
  | { type: 'MARK_ALL_READ'; userId: string }
  | { type: 'UPDATE_TASK_PROJECT'; taskId: string; projectId: string | undefined }
  | { type: 'UPDATE_TASK_DEPS'; taskId: string; dependsOn: string[] }
  | { type: 'CREATE_PROJECT'; project: Project }
  | { type: 'UPDATE_PROJECT'; projectId: string; patch: Partial<Pick<Project, 'name' | 'emoji' | 'description' | 'status' | 'deadline' | 'ownerId' | 'memberIds' | 'color'>> }
  | { type: 'UPDATE_USER'; userId: string; patch: Partial<Pick<User, 'password' | 'avatar'>> }
  | { type: 'CREATE_NOTE'; note: Note }
  | { type: 'UPDATE_NOTE'; noteId: string; patch: Partial<Pick<Note, 'title' | 'content' | 'emoji' | 'color' | 'pinned'>> }
  | { type: 'DELETE_NOTE'; noteId: string }
  | { type: 'SET_DASHBOARD_TODOS'; userId: string; items: DashboardTodoItem[] }
  | { type: 'ADD_USER_KB_ARTICLE'; article: UserKBArticle }
  | { type: 'UPDATE_USER_KB_ARTICLE'; articleId: string; patch: Partial<Pick<UserKBArticle, 'title' | 'content' | 'type' | 'url'>> }
  | { type: 'DELETE_USER_KB_ARTICLE'; articleId: string };

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function historyEntry(taskId: string, actorId: string, action: string, from?: TaskStatus, to?: TaskStatus, meta?: string): HistoryEntry {
  return { id: uid(), taskId, actorId, action, fromStatus: from, toStatus: to, createdAt: new Date().toISOString(), meta };
}

function statusActionLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    new: 'Задача создана',
    accepted: 'Задача принята',
    in_progress: 'Работа начата',
    waiting_response: 'Ожидание ответа',
    transferred: 'Задача передана',
    pending_director_review: 'Отправлено на проверку директору',
    returned_for_revision: 'Возвращена на доработку',
    completed: 'Задача выполнена',
    closed: 'Задача закрыта',
    postponed: 'Задача отложена',
    overdue: 'Задача просрочена',
    blocked: 'Задача заблокирована',
  };
  return map[status] ?? status;
}

function makeNotif(userId: string, type: NotificationType, taskId: string, taskTitle: string, message: string): Notification {
  return { id: uid(), userId, type, taskId, taskTitle, message, createdAt: new Date().toISOString(), read: false };
}

function computeNextDeadline(deadline: string, recurrence: RecurrenceType, customDays?: number): string {
  const d = new Date(deadline);
  switch (recurrence) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'custom': d.setDate(d.getDate() + (customDays ?? 7)); break;
    default: break;
  }
  return d.toISOString();
}

function spawnRecurringTask(task: Task, actorId: string): Task {
  const id = uid();
  const nextDeadline = computeNextDeadline(task.deadline, task.recurrence!, task.recurrenceCustomDays);
  return {
    id,
    title: task.title,
    description: task.description,
    createdBy: actorId,
    assignedTo: task.assignedTo,
    createdAt: new Date().toISOString(),
    deadline: nextDeadline,
    priority: task.priority,
    status: 'new',
    tags: task.tags,
    comments: [],
    history: [historyEntry(id, actorId, 'Задача создана (повторение)', undefined, 'new')],
    recurrence: task.recurrence,
    recurrenceCustomDays: task.recurrenceCustomDays,
    parentRecurringId: task.parentRecurringId ?? task.id,
    // Reset checklist (undone)
    checklist: task.checklist?.map(item => ({ ...item, id: uid(), done: false })),
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE_STATE':
      return action.state;
    case 'LOGIN':
      return { ...state, currentUser: action.user };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'CREATE_TASK':
      return {
        ...state,
        tasks: [action.task, ...state.tasks],
        notifications: [...state.notifications, ...action.notifications],
      };
    case 'UPDATE_STATUS': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, statusActionLabel(action.status), t.status, action.status, action.meta);
        return { ...t, status: action.status, history: [...t.history, entry] };
      });
      const allTasks = action.spawnedTask ? [action.spawnedTask, ...tasks] : tasks;
      const notifications = [...state.notifications, ...(action.spawnedNotifications ?? [])];
      return { ...state, tasks: allTasks, notifications };
    }
    case 'SEND_TO_DIRECTOR': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, 'Отправлено на проверку директору', t.status, 'pending_director_review');
        return { ...t, status: 'pending_director_review' as TaskStatus, sentToDirectorAt: new Date().toISOString(), history: [...t.history, entry] };
      });
      return { ...state, tasks };
    }
    case 'TRANSFER_TASK': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, `Передана пользователю ${action.toUserName}`, t.status, 'transferred', action.toUserId);
        return {
          ...t, status: 'transferred' as TaskStatus,
          transferredTo: action.toUserId, transferredFrom: action.actorId,
          history: [...t.history, entry],
        };
      });
      const notifications = action.notification
        ? [...state.notifications, action.notification]
        : state.notifications;
      return { ...state, tasks, notifications };
    }
    case 'ADD_COMMENT': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, 'Добавлен комментарий');
        return { ...t, comments: [...t.comments, action.comment], history: [...t.history, entry] };
      });
      return { ...state, tasks, notifications: [...state.notifications, ...action.notifications] };
    }
    case 'DIRECTOR_ACTION': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        if (action.action === 'approve') {
          const entry = historyEntry(t.id, action.actorId, 'Директор одобрил и закрыл задачу', t.status, 'closed');
          return { ...t, status: 'closed' as TaskStatus, history: [...t.history, entry] };
        } else {
          const note = action.note ?? '';
          const entry = historyEntry(t.id, action.actorId, `Директор вернул на доработку: ${note}`, t.status, 'returned_for_revision');
          return { ...t, status: 'returned_for_revision' as TaskStatus, history: [...t.history, entry] };
        }
      });
      const baseTasks = action.spawnedTask ? [action.spawnedTask, ...tasks] : tasks;
      const baseNotifications = action.notification
        ? [...state.notifications, action.notification]
        : state.notifications;
      const notifications = action.spawnedNotifications
        ? [...baseNotifications, ...action.spawnedNotifications]
        : baseNotifications;
      return { ...state, tasks: baseTasks, notifications };
    }
    case 'SET_PLANNED_DATE': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        return { ...t, plannedDate: action.plannedDate };
      });
      return { ...state, tasks };
    }
    case 'MOVE_TASK_TO_DAY': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const fromLabel = t.plannedDate
          ? new Date(t.plannedDate).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric' })
          : 'без даты';
        const toLabel = action.plannedDate
          ? new Date(action.plannedDate).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', year: 'numeric' })
          : 'без даты';
        const entry = historyEntry(t.id, action.actorId, `Задача перенесена: ${fromLabel} → ${toLabel}`);
        return { ...t, plannedDate: action.plannedDate, history: [...t.history, entry] };
      });
      return { ...state, tasks };
    }
    case 'UPDATE_DEADLINE': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, `Дедлайн изменён на ${action.deadline}`);
        return { ...t, deadline: action.deadline, history: [...t.history, entry] };
      });
      return { ...state, tasks };
    }
    case 'TOGGLE_CHECKLIST_ITEM': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const checklist = (t.checklist ?? []).map(item =>
          item.id === action.itemId ? { ...item, done: !item.done } : item
        );
        return { ...t, checklist };
      });
      return { ...state, tasks };
    }
    case 'ADD_CHECKLIST_ITEM': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const checklist = [...(t.checklist ?? []), action.item];
        return { ...t, checklist };
      });
      return { ...state, tasks };
    }
    case 'UPDATE_CHECKLIST_ITEM_ASSIGNEE': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const checklist = (t.checklist ?? []).map(item =>
          item.id === action.itemId ? { ...item, assignedTo: action.assignedTo } : item
        );
        return { ...t, checklist };
      });
      return { ...state, tasks };
    }
    case 'UPDATE_TASK_TAGS': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        return { ...t, tags: action.tags };
      });
      return { ...state, tasks };
    }
    case 'KANBAN_MOVE': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, statusActionLabel(action.status), t.status, action.status);
        return { ...t, status: action.status, history: [...t.history, entry] };
      });
      return { ...state, tasks };
    }
    case 'ADD_ATTACHMENT': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.attachment.taskId) return t;
        const entry = historyEntry(
          t.id, action.actorId,
          action.attachment.isLink
            ? `Добавлена ссылка: ${action.attachment.name}`
            : `Загружен файл: ${action.attachment.name}`
        );
        return { ...t, attachments: [...(t.attachments ?? []), action.attachment], history: [...t.history, entry] };
      });
      return { ...state, tasks };
    }
    case 'MARK_NOTIFICATION_READ': {
      const notifications = state.notifications.map(n =>
        n.id === action.notificationId ? { ...n, read: true } : n
      );
      return { ...state, notifications };
    }
    case 'MARK_ALL_READ': {
      const notifications = state.notifications.map(n =>
        n.userId === action.userId ? { ...n, read: true } : n
      );
      return { ...state, notifications };
    }
    case 'UPDATE_TASK_PROJECT': {
      // Remove task from old project, add to new one
      const oldProjectId = state.tasks.find(t => t.id === action.taskId)?.projectId;
      const tasks = state.tasks.map(t =>
        t.id === action.taskId ? { ...t, projectId: action.projectId } : t
      );
      const projects = state.projects.map(p => {
        if (p.id === oldProjectId && oldProjectId !== action.projectId) {
          return { ...p, taskIds: p.taskIds.filter(id => id !== action.taskId) };
        }
        if (p.id === action.projectId && action.projectId && !p.taskIds.includes(action.taskId)) {
          return { ...p, taskIds: [...p.taskIds, action.taskId] };
        }
        return p;
      });
      return { ...state, tasks, projects };
    }
    case 'UPDATE_TASK_DEPS': {
      const tasks = state.tasks.map(t =>
        t.id === action.taskId ? { ...t, dependsOn: action.dependsOn } : t
      );
      return { ...state, tasks };
    }
    case 'CREATE_PROJECT': {
      return { ...state, projects: [...state.projects, action.project] };
    }
    case 'UPDATE_PROJECT': {
      const projects = state.projects.map(p =>
        p.id === action.projectId ? { ...p, ...action.patch } : p
      );
      return { ...state, projects };
    }
    case 'UPDATE_USER': {
      const users = state.users.map(u =>
        u.id === action.userId ? { ...u, ...action.patch } : u
      );
      const currentUser = state.currentUser?.id === action.userId
        ? { ...state.currentUser, ...action.patch }
        : state.currentUser;
      return { ...state, users, currentUser };
    }
    case 'CREATE_NOTE':
      return { ...state, notes: [action.note, ...state.notes] };
    case 'UPDATE_NOTE': {
      const notes = state.notes.map(n =>
        n.id === action.noteId ? { ...n, ...action.patch, updatedAt: new Date().toISOString() } : n
      );
      return { ...state, notes };
    }
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter(n => n.id !== action.noteId) };
    case 'SET_DASHBOARD_TODOS':
      return {
        ...state,
        dashboardTodos: {
          ...state.dashboardTodos,
          [action.userId]: action.items,
        },
      };
    case 'ADD_USER_KB_ARTICLE':
      return { ...state, userKBArticles: [action.article, ...state.userKBArticles] };
    case 'UPDATE_USER_KB_ARTICLE': {
      const userKBArticles = state.userKBArticles.map(a =>
        a.id === action.articleId ? { ...a, ...action.patch, updatedAt: new Date().toISOString() } : a
      );
      return { ...state, userKBArticles };
    }
    case 'DELETE_USER_KB_ARTICLE':
      return { ...state, userKBArticles: state.userKBArticles.filter(a => a.id !== action.articleId) };
    default:
      return state;
  }
}

const initialState: AppState = {
  currentUser: null,
  tasks: INITIAL_TASKS,
  users: USERS,
  notifications: [],
  projects: INITIAL_PROJECTS,
  notes: [],
  userKBArticles: [],
  dashboardTodos: {},
};

function toAppState(parsed: Partial<AppState> & { currentUserId?: string | null }): AppState {
  const users = (parsed.users ?? USERS) as User[];
  const savedUser = parsed.currentUserId
    ? (users.find(u => u.id === parsed.currentUserId) ?? null)
    : null;
  return {
    ...initialState,
    ...parsed,
    currentUser: savedUser,
    notifications: parsed.notifications ?? [],
    projects: parsed.projects ?? INITIAL_PROJECTS,
    notes: parsed.notes ?? [],
    userKBArticles: parsed.userKBArticles ?? [],
    dashboardTodos: parsed.dashboardTodos ?? {},
  };
}

function normalizePersistedInput(parsed: unknown): PersistedStateData {
  if (!parsed || typeof parsed !== 'object') return {};
  if ('data' in parsed && parsed.data && typeof parsed.data === 'object') {
    return parsed.data as PersistedStateData;
  }
  return parsed as PersistedStateData;
}

function toPersistedStateData(state: AppState): PersistedStateData {
  return {
    ...state,
    currentUserId: state.currentUser?.id,
    currentUser: undefined,
  };
}

function getStateFingerprint(state: AppState): string {
  return JSON.stringify(toPersistedStateData(state));
}

function serializeState(state: AppState): string {
  const payload: PersistedStatePayload = {
    version: STATE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: toPersistedStateData(state),
  };
  return JSON.stringify(payload);
}

function loadState(): AppState {
  const currentPayload = stateSyncAdapter.load();
  if (currentPayload) {
    try {
      const parsed = JSON.parse(currentPayload);
      const normalized = normalizePersistedInput(parsed);
      return toAppState(normalized);
    } catch { /* ignore */ }
  }

  if (stateSyncAdapter.status.mode !== 'backend') {
    for (const key of LEGACY_LS_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const normalized = normalizePersistedInput(parsed);
        return toAppState(normalized);
      } catch { /* ignore */ }
    }
  }
  return initialState;
}

function saveState(state: AppState) {
  stateSyncAdapter.save(serializeState(state));
}

interface AppContextValue {
  state: AppState;
  login: (login: string, password: string) => boolean;
  logout: () => void;
  createTask: (data: {
    title: string; description: string; assignedTo: string;
    deadline: string; priority: TaskPriority; plannedDate?: string; tags?: TaskTag[];
    checklist?: string[]; recurrence?: RecurrenceType; recurrenceCustomDays?: number;
    reactionDeadline?: string; projectId?: string; dependsOn?: string[];
  }) => void;
  updateStatus: (taskId: string, status: TaskStatus, meta?: string) => void;
  transferTask: (taskId: string, toUserId: string) => void;
  sendToDirectorReview: (taskId: string) => void;
  addComment: (taskId: string, text: string) => void;
  directorAction: (taskId: string, action: 'approve' | 'return', note?: string) => void;
  setPlannedDate: (taskId: string, plannedDate: string) => void;
  moveTaskToDay: (taskId: string, plannedDate: string) => void;
  updateDeadline: (taskId: string, deadline: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addChecklistItem: (taskId: string, text: string) => void;
  updateChecklistItemAssignee: (taskId: string, itemId: string, assignedTo: string | undefined) => void;
  updateTaskTags: (taskId: string, tags: TaskTag[]) => void;
  kanbanMove: (taskId: string, status: TaskStatus) => void;
  addAttachment: (taskId: string, data: Omit<Attachment, 'id' | 'taskId' | 'uploadedBy' | 'uploadedAt'>) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllRead: () => void;
  updateTaskProject: (taskId: string, projectId: string | undefined) => void;
  updateTaskDeps: (taskId: string, dependsOn: string[]) => void;
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'taskIds'>) => void;
  updateProject: (projectId: string, patch: Partial<Pick<Project, 'name' | 'emoji' | 'description' | 'status' | 'deadline' | 'ownerId' | 'memberIds' | 'color'>>) => void;
  updateUserPassword: (currentPassword: string, newPassword: string) => boolean;
  updateUserAvatar: (avatar: string) => void;
  createNote: (data: { title: string; content: string; emoji: string; color: string }) => void;
  updateNote: (noteId: string, patch: Partial<Pick<Note, 'title' | 'content' | 'emoji' | 'color' | 'pinned'>>) => void;
  deleteNote: (noteId: string) => void;
  setDashboardTodos: (userId: string, items: DashboardTodoItem[]) => void;
  addUserKBArticle: (data: Omit<UserKBArticle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  updateUserKBArticle: (articleId: string, patch: Partial<Pick<UserKBArticle, 'title' | 'content' | 'type' | 'url'>>) => void;
  deleteUserKBArticle: (articleId: string) => void;
  exportState: () => string;
  importState: (json: string) => boolean;
  syncStatus: SyncStatus;
}

const AppContext = createContext<AppContextValue | null>(null);

/* ── Sound / browser-notification helpers ─── */
function playNotificationSound() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx: typeof AudioContext = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => ctx.close(), 500);
  } catch { /* ignore */ }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
    try { new Notification(title, { body, icon: '/favicon.ico' }); } catch { /* ignore */ }
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [syncBootstrapReady, setSyncBootstrapReady] = useState(!stateSyncAdapter.requiresBootstrapBeforeSave);
  const prevUnreadCountRef = useRef<number>(0);
  const notifInitializedRef = useRef(false);
  const lastStateFingerprintRef = useRef<string>('');

  useEffect(() => {
    if (!syncBootstrapReady) return;
    const fingerprint = getStateFingerprint(state);
    if (fingerprint === lastStateFingerprintRef.current) return;
    lastStateFingerprintRef.current = fingerprint;
    saveState(state);
  }, [state, syncBootstrapReady]);

  useEffect(() => {
    return stateSyncAdapter.subscribe((payload) => {
      if (!payload) {
        setSyncBootstrapReady(true);
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        const nextState = toAppState(normalizePersistedInput(parsed));
        const nextFingerprint = getStateFingerprint(nextState);
        if (nextFingerprint === lastStateFingerprintRef.current) {
          setSyncBootstrapReady(true);
          return;
        }
        lastStateFingerprintRef.current = nextFingerprint;
        dispatch({ type: 'HYDRATE_STATE', state: nextState });
      } catch { /* ignore */ }
      setSyncBootstrapReady(true);
    });
  }, []);

  // Request browser notification permission once on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { /* ignore */ });
    }
  }, []);

  // Play sound & show browser notification when new unread notifications arrive
  useEffect(() => {
    if (!state.currentUser) {
      prevUnreadCountRef.current = 0;
      notifInitializedRef.current = false;
      return;
    }
    const myUnread = state.notifications.filter(
      n => n.userId === state.currentUser!.id && !n.read
    );
    // On first render after login, set baseline without playing sound
    if (!notifInitializedRef.current) {
      prevUnreadCountRef.current = myUnread.length;
      notifInitializedRef.current = true;
      return;
    }
    if (myUnread.length > prevUnreadCountRef.current) {
      playNotificationSound();
      const latest = [...myUnread].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      if (latest) showBrowserNotification(latest.taskTitle, latest.message);
    }
    prevUnreadCountRef.current = myUnread.length;
  }, [state.notifications, state.currentUser]);

  function login(loginVal: string, password: string): boolean {
    const user = state.users.find(u => u.login === loginVal && u.password === password);
    if (user) { dispatch({ type: 'LOGIN', user }); return true; }
    return false;
  }

  function logout() { dispatch({ type: 'LOGOUT' }); }

  function createTask(data: {
    title: string; description: string; assignedTo: string;
    deadline: string; priority: TaskPriority; plannedDate?: string; tags?: TaskTag[];
    checklist?: string[]; recurrence?: RecurrenceType; recurrenceCustomDays?: number;
    reactionDeadline?: string;
  }) {
    if (!state.currentUser) return;
    const id = uid();
    const nowTs = new Date().toISOString();
    const checklist: ChecklistItem[] | undefined = data.checklist?.length
      ? data.checklist.map(text => ({ id: uid(), text, done: false }))
      : undefined;
    const task: Task = {
      id,
      title: data.title,
      description: data.description,
      createdBy: state.currentUser.id,
      assignedTo: data.assignedTo,
      createdAt: nowTs,
      deadline: data.deadline,
      plannedDate: data.plannedDate,
      priority: data.priority,
      tags: data.tags,
      status: 'new',
      comments: [],
      history: [historyEntry(id, state.currentUser.id, 'Задача создана', undefined, 'new')],
      checklist,
      recurrence: data.recurrence !== 'none' ? data.recurrence : undefined,
      recurrenceCustomDays: data.recurrenceCustomDays,
      reactionDeadline: data.reactionDeadline,
    };
    const notifications: Notification[] = [];
    if (data.assignedTo !== state.currentUser.id) {
      notifications.push(makeNotif(
        data.assignedTo, 'new_task', id, data.title,
        `Вам назначена новая задача: «${data.title}»`
      ));
    }
    dispatch({ type: 'CREATE_TASK', task, notifications });
  }

  function updateStatus(taskId: string, status: TaskStatus, meta?: string) {
    if (!state.currentUser) return;
    const task = state.tasks.find(t => t.id === taskId);
    let spawnedTask: Task | undefined;
    let spawnedNotifications: Notification[] | undefined;
    if (task && (status === 'completed' || status === 'closed') && task.recurrence && task.recurrence !== 'none') {
      spawnedTask = spawnRecurringTask(task, state.currentUser.id);
      spawnedNotifications = [];
      if (spawnedTask.assignedTo !== state.currentUser.id) {
        spawnedNotifications.push(makeNotif(
          spawnedTask.assignedTo, 'new_task', spawnedTask.id, spawnedTask.title,
          `Создана повторяющаяся задача: «${spawnedTask.title}»`
        ));
      }
    }
    dispatch({ type: 'UPDATE_STATUS', taskId, status, actorId: state.currentUser.id, meta, spawnedTask, spawnedNotifications });
  }

  function transferTask(taskId: string, toUserId: string) {
    if (!state.currentUser) return;
    const toUser = state.users.find(u => u.id === toUserId);
    if (!toUser) return;
    const task = state.tasks.find(t => t.id === taskId);
    const notification = task
      ? makeNotif(toUserId, 'task_transferred', taskId, task.title, `Вам передана задача: «${task.title}»`)
      : undefined;
    dispatch({ type: 'TRANSFER_TASK', taskId, toUserId, actorId: state.currentUser.id, toUserName: toUser.name, notification });
  }

  function sendToDirectorReview(taskId: string) {
    if (!state.currentUser) return;
    dispatch({ type: 'SEND_TO_DIRECTOR', taskId, actorId: state.currentUser.id });
  }

  function addComment(taskId: string, text: string) {
    if (!state.currentUser) return;
    const mentionedIds = parseMentions(text, state.users, state.currentUser.id);
    const comment: Comment = {
      id: uid(), taskId, authorId: state.currentUser.id, text,
      createdAt: new Date().toISOString(),
      mentions: mentionedIds.length > 0 ? mentionedIds : undefined,
    };
    const task = state.tasks.find(t => t.id === taskId);
    const notifications: Notification[] = [];
    if (task) {
      const participants = new Set([task.assignedTo, task.createdBy]);
      if (task.transferredTo) participants.add(task.transferredTo);
      participants.delete(state.currentUser.id);
      participants.forEach(userId => {
        if (!mentionedIds.includes(userId)) {
          notifications.push(makeNotif(
            userId, 'new_comment', taskId, task.title,
            `Новый комментарий в задаче «${task.title}»`
          ));
        }
      });
      mentionedIds.forEach(userId => {
        notifications.push(makeNotif(
          userId, 'mention', taskId, task.title,
          `Вас упомянули в задаче «${task.title}»`
        ));
      });
    }
    dispatch({ type: 'ADD_COMMENT', comment, taskId, actorId: state.currentUser.id, notifications });
  }

  function directorAction(taskId: string, action: 'approve' | 'return', note?: string) {
    if (!state.currentUser) return;
    const task = state.tasks.find(t => t.id === taskId);
    let notification: Notification | undefined;
    let spawnedTask: Task | undefined;
    let spawnedNotifications: Notification[] | undefined;
    if (task) {
      if (action === 'approve') {
        notification = makeNotif(
          task.assignedTo, 'task_closed', taskId, task.title,
          `Директор закрыл задачу: «${task.title}»`
        );
        if (task.recurrence && task.recurrence !== 'none') {
          spawnedTask = spawnRecurringTask(task, state.currentUser.id);
          spawnedNotifications = [];
          if (spawnedTask.assignedTo !== state.currentUser.id) {
            spawnedNotifications.push(makeNotif(
              spawnedTask.assignedTo, 'new_task', spawnedTask.id, spawnedTask.title,
              `Создана повторяющаяся задача: «${spawnedTask.title}»`
            ));
          }
        }
      } else {
        notification = makeNotif(
          task.assignedTo, 'task_returned', taskId, task.title,
          `Директор вернул задачу на доработку: «${task.title}»`
        );
      }
    }
    dispatch({ type: 'DIRECTOR_ACTION', taskId, action, actorId: state.currentUser.id, note, notification, spawnedTask, spawnedNotifications });
  }

  function setPlannedDate(taskId: string, plannedDate: string) {
    dispatch({ type: 'SET_PLANNED_DATE', taskId, plannedDate });
  }

  function moveTaskToDay(taskId: string, plannedDate: string) {
    if (!state.currentUser) return;
    dispatch({ type: 'MOVE_TASK_TO_DAY', taskId, plannedDate, actorId: state.currentUser.id });
  }

  function updateDeadline(taskId: string, deadline: string) {
    if (!state.currentUser) return;
    dispatch({ type: 'UPDATE_DEADLINE', taskId, deadline, actorId: state.currentUser.id });
  }

  function toggleChecklistItem(taskId: string, itemId: string) {
    dispatch({ type: 'TOGGLE_CHECKLIST_ITEM', taskId, itemId });
  }

  function addChecklistItem(taskId: string, text: string) {
    const item: ChecklistItem = { id: uid(), text, done: false };
    dispatch({ type: 'ADD_CHECKLIST_ITEM', taskId, item });
  }

  function updateChecklistItemAssignee(taskId: string, itemId: string, assignedTo: string | undefined) {
    dispatch({ type: 'UPDATE_CHECKLIST_ITEM_ASSIGNEE', taskId, itemId, assignedTo });
  }

  function updateTaskTags(taskId: string, tags: TaskTag[]) {
    dispatch({ type: 'UPDATE_TASK_TAGS', taskId, tags });
  }

  function kanbanMove(taskId: string, status: TaskStatus) {
    if (!state.currentUser) return;
    dispatch({ type: 'KANBAN_MOVE', taskId, status, actorId: state.currentUser.id });
  }

  function addAttachment(taskId: string, data: Omit<Attachment, 'id' | 'taskId' | 'uploadedBy' | 'uploadedAt'>) {
    if (!state.currentUser) return;
    const attachment: Attachment = {
      ...data,
      id: uid(),
      taskId,
      uploadedBy: state.currentUser.id,
      uploadedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_ATTACHMENT', attachment, actorId: state.currentUser.id });
  }

  function markNotificationRead(notificationId: string) {
    dispatch({ type: 'MARK_NOTIFICATION_READ', notificationId });
  }

  function markAllRead() {
    if (!state.currentUser) return;
    dispatch({ type: 'MARK_ALL_READ', userId: state.currentUser.id });
  }

  function updateTaskProject(taskId: string, projectId: string | undefined) {
    dispatch({ type: 'UPDATE_TASK_PROJECT', taskId, projectId });
  }

  function updateTaskDeps(taskId: string, dependsOn: string[]) {
    dispatch({ type: 'UPDATE_TASK_DEPS', taskId, dependsOn });
  }

  function createProject(data: Omit<Project, 'id' | 'createdAt' | 'taskIds'>) {
    const project: Project = { ...data, id: uid(), createdAt: new Date().toISOString(), taskIds: [] };
    dispatch({ type: 'CREATE_PROJECT', project });
  }

  function updateProject(projectId: string, patch: Partial<Pick<Project, 'name' | 'emoji' | 'description' | 'status' | 'deadline' | 'ownerId' | 'memberIds' | 'color'>>) {
    dispatch({ type: 'UPDATE_PROJECT', projectId, patch });
  }

  function updateUserPassword(currentPassword: string, newPassword: string): boolean {
    if (!state.currentUser) return false;
    if (state.currentUser.password !== currentPassword) return false;
    dispatch({ type: 'UPDATE_USER', userId: state.currentUser.id, patch: { password: newPassword } });
    return true;
  }

  function updateUserAvatar(avatar: string) {
    if (!state.currentUser) return;
    dispatch({ type: 'UPDATE_USER', userId: state.currentUser.id, patch: { avatar } });
  }

  function createNote(data: { title: string; content: string; emoji: string; color: string }) {
    if (!state.currentUser) return;
    const note: Note = {
      id: uid(),
      userId: state.currentUser.id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE_NOTE', note });
  }

  function updateNote(noteId: string, patch: Partial<Pick<Note, 'title' | 'content' | 'emoji' | 'color' | 'pinned'>>) {
    dispatch({ type: 'UPDATE_NOTE', noteId, patch });
  }

  function deleteNote(noteId: string) {
    dispatch({ type: 'DELETE_NOTE', noteId });
  }

  function setDashboardTodos(userId: string, items: DashboardTodoItem[]) {
    dispatch({ type: 'SET_DASHBOARD_TODOS', userId, items });
  }

  function addUserKBArticle(data: Omit<UserKBArticle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    if (!state.currentUser) return;
    const article: UserKBArticle = {
      id: uid(),
      userId: state.currentUser.id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_USER_KB_ARTICLE', article });
  }

  function updateUserKBArticle(articleId: string, patch: Partial<Pick<UserKBArticle, 'title' | 'content' | 'type' | 'url'>>) {
    dispatch({ type: 'UPDATE_USER_KB_ARTICLE', articleId, patch });
  }

  function deleteUserKBArticle(articleId: string) {
    dispatch({ type: 'DELETE_USER_KB_ARTICLE', articleId });
  }

  function exportState(): string {
    return serializeState(state);
  }

  function importState(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      const normalized = normalizePersistedInput(parsed);
      const newState = toAppState(normalized);
      stateSyncAdapter.save(serializeState(newState));
      dispatch({ type: 'HYDRATE_STATE', state: newState });
      return true;
    } catch {
      return false;
    }
  }

  return (
    <AppContext.Provider value={{
      state, login, logout, createTask, updateStatus, transferTask,
      sendToDirectorReview, addComment, directorAction,
      setPlannedDate, moveTaskToDay, updateDeadline, toggleChecklistItem, addChecklistItem,
      updateChecklistItemAssignee, updateTaskTags, kanbanMove,
      addAttachment, markNotificationRead, markAllRead,
      updateTaskProject, updateTaskDeps, createProject, updateProject,
      updateUserPassword, updateUserAvatar,
      createNote, updateNote, deleteNote,
      setDashboardTodos,
      addUserKBArticle, updateUserKBArticle, deleteUserKBArticle,
      exportState, importState,
      syncStatus: stateSyncAdapter.status,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
