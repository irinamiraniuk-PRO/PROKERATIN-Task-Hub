import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, User, Task, TaskStatus, TaskPriority, Comment, HistoryEntry } from '../types';
import { USERS, INITIAL_TASKS } from '../data/initialData';

const LS_KEY = 'prokeratin_state';

type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'CREATE_TASK'; task: Task }
  | { type: 'UPDATE_STATUS'; taskId: string; status: TaskStatus; actorId: string; meta?: string }
  | { type: 'TRANSFER_TASK'; taskId: string; toUserId: string; actorId: string; toUserName: string }
  | { type: 'ADD_COMMENT'; comment: Comment; taskId: string; actorId: string }
  | { type: 'DIRECTOR_ACTION'; taskId: string; action: 'approve' | 'return'; actorId: string; note?: string };

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
    completed: 'Задача выполнена',
    closed: 'Задача закрыта',
    postponed: 'Задача отложена',
    overdue: 'Задача просрочена',
  };
  return map[status] ?? status;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.user };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'CREATE_TASK':
      return { ...state, tasks: [action.task, ...state.tasks] };
    case 'UPDATE_STATUS': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, statusActionLabel(action.status), t.status, action.status, action.meta);
        return { ...t, status: action.status, history: [...t.history, entry] };
      });
      return { ...state, tasks };
    }
    case 'TRANSFER_TASK': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, `Передана пользователю ${action.toUserName}`, t.status, 'transferred', action.toUserId);
        return {
          ...t,
          status: 'transferred' as TaskStatus,
          transferredTo: action.toUserId,
          transferredFrom: action.actorId,
          history: [...t.history, entry],
        };
      });
      return { ...state, tasks };
    }
    case 'ADD_COMMENT': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        const entry = historyEntry(t.id, action.actorId, 'Добавлен комментарий');
        return { ...t, comments: [...t.comments, action.comment], history: [...t.history, entry] };
      });
      return { ...state, tasks };
    }
    case 'DIRECTOR_ACTION': {
      const tasks = state.tasks.map(t => {
        if (t.id !== action.taskId) return t;
        if (action.action === 'approve') {
          const entry = historyEntry(t.id, action.actorId, 'Директор одобрил и закрыл задачу', t.status, 'closed');
          return { ...t, status: 'closed' as TaskStatus, history: [...t.history, entry] };
        } else {
          const entry = historyEntry(t.id, action.actorId, `Директор вернул на доработку: ${action.note ?? ''}`, t.status, 'in_progress');
          return { ...t, status: 'in_progress' as TaskStatus, history: [...t.history, entry] };
        }
      });
      return { ...state, tasks };
    }
    default:
      return state;
  }
}

const initialState: AppState = {
  currentUser: null,
  tasks: INITIAL_TASKS,
  users: USERS,
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return { ...initialState, ...parsed, currentUser: null };
    }
  } catch { /* ignore */ }
  return initialState;
}

function saveState(state: AppState) {
  try {
    const { currentUser: _cu, ...rest } = state;
    localStorage.setItem(LS_KEY, JSON.stringify(rest));
  } catch { /* ignore */ }
}

interface AppContextValue {
  state: AppState;
  login: (login: string, password: string) => boolean;
  logout: () => void;
  createTask: (data: { title: string; description: string; assignedTo: string; deadline: string; priority: TaskPriority }) => void;
  updateStatus: (taskId: string, status: TaskStatus, meta?: string) => void;
  transferTask: (taskId: string, toUserId: string) => void;
  sendToDirectorReview: (taskId: string) => void;
  addComment: (taskId: string, text: string) => void;
  directorAction: (taskId: string, action: 'approve' | 'return', note?: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  function login(loginVal: string, password: string): boolean {
    const user = state.users.find(u => u.login === loginVal && u.password === password);
    if (user) { dispatch({ type: 'LOGIN', user }); return true; }
    return false;
  }

  function logout() { dispatch({ type: 'LOGOUT' }); }

  function createTask(data: { title: string; description: string; assignedTo: string; deadline: string; priority: TaskPriority }) {
    if (!state.currentUser) return;
    const id = uid();
    const now = new Date().toISOString();
    const task: Task = {
      id,
      title: data.title,
      description: data.description,
      createdBy: state.currentUser.id,
      assignedTo: data.assignedTo,
      createdAt: now,
      deadline: data.deadline,
      priority: data.priority,
      status: 'new',
      comments: [],
      history: [historyEntry(id, state.currentUser.id, 'Задача создана', undefined, 'new')],
    };
    dispatch({ type: 'CREATE_TASK', task });
  }

  function updateStatus(taskId: string, status: TaskStatus, meta?: string) {
    if (!state.currentUser) return;
    dispatch({ type: 'UPDATE_STATUS', taskId, status, actorId: state.currentUser.id, meta });
  }

  function transferTask(taskId: string, toUserId: string) {
    if (!state.currentUser) return;
    const toUser = state.users.find(u => u.id === toUserId);
    if (!toUser) return;
    dispatch({ type: 'TRANSFER_TASK', taskId, toUserId, actorId: state.currentUser.id, toUserName: toUser.name });
  }

  function sendToDirectorReview(taskId: string) {
    if (!state.currentUser) return;
    dispatch({ type: 'UPDATE_STATUS', taskId, status: 'pending_director_review', actorId: state.currentUser.id });
  }

  function addComment(taskId: string, text: string) {
    if (!state.currentUser) return;
    const comment: Comment = { id: uid(), taskId, authorId: state.currentUser.id, text, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_COMMENT', comment, taskId, actorId: state.currentUser.id });
  }

  function directorAction(taskId: string, action: 'approve' | 'return', note?: string) {
    if (!state.currentUser) return;
    dispatch({ type: 'DIRECTOR_ACTION', taskId, action, actorId: state.currentUser.id, note });
  }

  return (
    <AppContext.Provider value={{ state, login, logout, createTask, updateStatus, transferTask, sendToDirectorReview, addComment, directorAction }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
