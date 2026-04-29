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

export interface User {
  id: string;
  name: string;
  login: string;
  password: string;
  role: UserRole;
  avatar?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: string;
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
  comments: Comment[];
  history: HistoryEntry[];
  checklist?: ChecklistItem[];
  transferredTo?: string;
  transferredFrom?: string;
  sentToDirectorAt?: string;
}

export interface AppState {
  currentUser: User | null;
  tasks: Task[];
  users: User[];
}
