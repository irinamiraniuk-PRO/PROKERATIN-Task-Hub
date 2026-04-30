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
  | 'overdue';

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

export type NotificationType =
  | 'new_task'
  | 'task_transferred'
  | 'task_returned'
  | 'task_closed'
  | 'new_comment'
  | 'mention';

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
}

export interface AppState {
  currentUser: User | null;
  tasks: Task[];
  users: User[];
  notifications: Notification[];
}
