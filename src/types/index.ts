export type UserRole = 'director' | 'employee';

export type TaskStatus =
  | 'new'
  | 'accepted'
  | 'in_progress'
  | 'waiting_response'
  | 'transferred'
  | 'pending_director_review'
  | 'returned_for_revision'
  | 'completed'
  | 'closed'
  | 'postponed'
  | 'overdue'
  | 'blocked';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskTag =
  | 'сайт'
  | 'закупка'
  | 'бухгалтерия'
  | 'контент'
  | 'Instagram'
  | 'Telegram'
  | 'обучение'
  | 'клиент'
  | 'срочно'
  | 'директор'
  | 'личное'
  | 'дизайн'
  | 'разработка'
  | 'акция недели';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export type NotificationType =
  | 'new_task'
  | 'task_transferred'
  | 'task_returned'
  | 'task_closed'
  | 'new_comment'
  | 'mention';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface User {
  id: string;
  name: string;
  login: string;
  password: string;
  role: UserRole;
  avatar?: string;
  color?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: string;
  mentions?: string[]; // user IDs mentioned via @
}

export interface HistoryEntry {
  id: string;
  taskId: string;
  actorId: string;
  action: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  createdAt: string;
  meta?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  assignedTo?: string; // user ID
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  mimeType: string;
  url: string; // base64 data URL for files, actual URL for links
  uploadedBy: string;
  uploadedAt: string;
  size?: number; // bytes
  isLink?: boolean;
}

export interface Notification {
  id: string;
  userId: string; // recipient
  type: NotificationType;
  taskId: string;
  taskTitle: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  memberIds: string[];
  deadline: string; // ISO
  createdAt: string; // ISO
  color: string;
  taskIds: string[]; // linked task IDs
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  assignedTo: string;
  createdAt: string;
  deadline: string;
  plannedDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags?: TaskTag[];
  comments: Comment[];
  history: HistoryEntry[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  transferredTo?: string;
  transferredFrom?: string;
  sentToDirectorAt?: string;
  recurrence?: RecurrenceType;
  recurrenceCustomDays?: number;
  parentRecurringId?: string; // ID of the original recurring task
  reactionDeadline?: string; // ISO date — when a response/reaction is expected by
  projectId?: string; // linked project ID
  dependsOn?: string[]; // task IDs this task depends on (must complete first)
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  emoji: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface UserKBArticle {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'regulation' | 'instruction' | 'template' | 'checklist' | 'rules' | 'link';
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardTodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface AppState {
  currentUser: User | null;
  tasks: Task[];
  users: User[];
  notifications: Notification[];
  projects: Project[];
  notes: Note[];
  userKBArticles: UserKBArticle[];
  dashboardTodos: Record<string, DashboardTodoItem[]>;
}
