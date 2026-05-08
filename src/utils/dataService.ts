import type {
  DashboardTodoItem,
  HistoryEntry,
  Note,
  Notification,
  Project,
  Task,
  User,
  UserKBArticle,
} from '../types';
import { supabaseClient } from './supabaseClient';

export interface PersistedStateData {
  users?: User[];
  tasks?: Task[];
  notes?: Note[];
  notifications?: Notification[];
  projects?: Project[];
  userKBArticles?: UserKBArticle[];
  dashboardTodos?: Record<string, DashboardTodoItem[]>;
}

interface ProfileRow {
  id: string;
  name: string;
  login: string;
  role: User['role'];
  avatar: string | null;
  color: string | null;
  deleted_at: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  created_by: string;
  assigned_to: string;
  created_at: string;
  deadline: string;
  planned_date: string | null;
  priority: Task['priority'];
  status: Task['status'];
  tags: unknown;
  checklist: unknown;
  attachments: unknown;
  transferred_to: string | null;
  transferred_from: string | null;
  sent_to_director_at: string | null;
  recurrence: Task['recurrence'] | null;
  recurrence_custom_days: number | null;
  parent_recurring_id: string | null;
  reaction_deadline: string | null;
  project_id: string | null;
  depends_on: unknown;
  deleted_at: string | null;
}

interface CommentRow {
  id: string;
  task_id: string;
  author_id: string;
  text: string;
  created_at: string;
  mentions: unknown;
  deleted_at: string | null;
}

interface TaskHistoryRow {
  id: string;
  task_id: string;
  actor_id: string;
  action: string;
  from_status: HistoryEntry['fromStatus'] | null;
  to_status: HistoryEntry['toStatus'] | null;
  created_at: string;
  meta: string | null;
  deleted_at: string | null;
}

interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  emoji: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface UserSettingsRow {
  user_id: string;
  settings: unknown;
  deleted_at: string | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normalizeRecord<T>(value: unknown): Record<string, T> {
  return isObject(value) ? value as Record<string, T> : {};
}

function isEmptyStateData(data: PersistedStateData): boolean {
  return (
    (data.users ?? []).length === 0
    && (data.tasks ?? []).length === 0
    && (data.notes ?? []).length === 0
    && (data.notifications ?? []).length === 0
    && (data.projects ?? []).length === 0
    && (data.userKBArticles ?? []).length === 0
    && Object.keys(data.dashboardTodos ?? {}).length === 0
  );
}

export class SupabaseDataService {
  private client = supabaseClient;

  private assertClient() {
    if (!this.client) {
      throw new Error('Supabase client is not configured');
    }
    return this.client;
  }

  private async fetchRows<T>(
    table: string,
    selectQuery: string,
    orderBy?: { column: string; ascending?: boolean },
    limit?: number,
  ): Promise<T[]> {
    const client = this.assertClient();
    let query = client.from(table).select(selectQuery).is('deleted_at', null);
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    return (data ?? []) as T[];
  }

  private async fetchRowsSafe<T>(
    table: string,
    selectQuery: string,
    orderBy?: { column: string; ascending?: boolean },
    limit?: number,
  ): Promise<T[]> {
    try {
      return await this.fetchRows<T>(table, selectQuery, orderBy, limit);
    } catch {
      return [];
    }
  }

  private async archiveByIds(table: string, keyColumn: string, ids: string[]): Promise<void> {
    if (!ids.length) return;
    const client = this.assertClient();
    const { error } = await client
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .in(keyColumn, ids)
      .is('deleted_at', null);
    if (error) throw new Error(`Failed to archive obsolete rows in ${table}: ${error.message}`);
  }

  private async upsertRows(table: string, rows: Record<string, unknown>[], keyColumn: string): Promise<void> {
    if (!rows.length) return;
    const client = this.assertClient();
    const withActiveFlag = rows.map(row => ({ ...row, deleted_at: null }));
    const { error } = await client.from(table).upsert(withActiveFlag, { onConflict: keyColumn, ignoreDuplicates: false });
    if (error) throw new Error(`Failed to upsert ${table}: ${error.message}`);
  }

  private async syncTable(table: string, keyColumn: string, rows: Record<string, unknown>[]): Promise<void> {
    await this.upsertRows(table, rows, keyColumn);
    const existingRows = await this.fetchRows<Record<string, unknown>>(table, keyColumn);
    const nextIds = new Set(rows.map(row => String(row[keyColumn])));
    const obsoleteIds = existingRows
      .map(row => String(row[keyColumn] ?? ''))
      .filter(id => id && !nextIds.has(id));
    await this.archiveByIds(table, keyColumn, obsoleteIds);
  }

  async fetchStateData(): Promise<PersistedStateData | null> {
    const [profiles, taskRows, commentRows, historyRows, noteRows, settingsRows] = await Promise.all([
      this.fetchRowsSafe<ProfileRow>('profiles', 'id,name,login,role,avatar,color,deleted_at', { column: 'name', ascending: true }),
      this.fetchRowsSafe<TaskRow>('tasks', '*', { column: 'created_at', ascending: false }),
      this.fetchRowsSafe<CommentRow>('comments', 'id,task_id,author_id,text,created_at,mentions,deleted_at', { column: 'created_at', ascending: true }),
      this.fetchRowsSafe<TaskHistoryRow>('task_history', 'id,task_id,actor_id,action,from_status,to_status,created_at,meta,deleted_at', { column: 'created_at', ascending: true }),
      this.fetchRowsSafe<NoteRow>('notes', 'id,user_id,title,content,emoji,color,pinned,created_at,updated_at,deleted_at', { column: 'updated_at', ascending: false }),
      this.fetchRowsSafe<UserSettingsRow>('user_settings', 'user_id,settings,deleted_at', { column: 'updated_at', ascending: false }, 1),
    ]);

    const users: User[] = profiles.map((row) => ({
      id: row.id,
      name: row.name,
      login: row.login,
      role: row.role,
      avatar: row.avatar ?? undefined,
      color: row.color ?? undefined,
    }));

    const commentsByTaskId = new Map<string, Task['comments']>();
    commentRows.forEach((row) => {
      const list = commentsByTaskId.get(row.task_id) ?? [];
      list.push({
        id: row.id,
        taskId: row.task_id,
        authorId: row.author_id,
        text: row.text,
        createdAt: row.created_at,
        mentions: readJson<string[] | undefined>(row.mentions, undefined),
      });
      commentsByTaskId.set(row.task_id, list);
    });

    const historyByTaskId = new Map<string, HistoryEntry[]>();
    historyRows.forEach((row) => {
      const list = historyByTaskId.get(row.task_id) ?? [];
      list.push({
        id: row.id,
        taskId: row.task_id,
        actorId: row.actor_id,
        action: row.action,
        fromStatus: row.from_status ?? undefined,
        toStatus: row.to_status ?? undefined,
        createdAt: row.created_at,
        meta: row.meta ?? undefined,
      });
      historyByTaskId.set(row.task_id, list);
    });

    const tasks: Task[] = taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      createdBy: row.created_by,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
      deadline: row.deadline,
      plannedDate: row.planned_date ?? undefined,
      priority: row.priority,
      status: row.status,
      tags: readJson<Task['tags']>(row.tags, []),
      comments: commentsByTaskId.get(row.id) ?? [],
      history: historyByTaskId.get(row.id) ?? [],
      checklist: readJson<Task['checklist']>(row.checklist, []),
      attachments: readJson<Task['attachments']>(row.attachments, []),
      transferredTo: row.transferred_to ?? undefined,
      transferredFrom: row.transferred_from ?? undefined,
      sentToDirectorAt: row.sent_to_director_at ?? undefined,
      recurrence: row.recurrence ?? undefined,
      recurrenceCustomDays: row.recurrence_custom_days ?? undefined,
      parentRecurringId: row.parent_recurring_id ?? undefined,
      reactionDeadline: row.reaction_deadline ?? undefined,
      projectId: row.project_id ?? undefined,
      dependsOn: readJson<string[]>(row.depends_on, []),
    }));

    const notes: Note[] = noteRows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      emoji: row.emoji,
      color: row.color,
      pinned: row.pinned,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const settings = readJson<{
      notifications?: Notification[];
      projects?: Project[];
      userKBArticles?: UserKBArticle[];
      dashboardTodos?: Record<string, DashboardTodoItem[]>;
    } | undefined>(settingsRows[0]?.settings, undefined);

    const data: PersistedStateData = {
      users,
      tasks,
      notes,
      notifications: settings?.notifications ?? [],
      projects: settings?.projects ?? [],
      userKBArticles: settings?.userKBArticles ?? [],
      dashboardTodos: settings?.dashboardTodos ?? {},
    };

    if (isEmptyStateData(data)) return null;
    return data;
  }

  async pushStateData(data: PersistedStateData): Promise<void> {
    const nowIso = new Date().toISOString();

    const users = normalizeArray<User>(data.users);
    const tasks = normalizeArray<Task>(data.tasks);
    const notes = normalizeArray<Note>(data.notes);
    const notifications = normalizeArray<Notification>(data.notifications);
    const projects = normalizeArray<Project>(data.projects);
    const userKBArticles = normalizeArray<UserKBArticle>(data.userKBArticles);
    const dashboardTodos = normalizeRecord<DashboardTodoItem[]>(data.dashboardTodos);

    const profileRows = users.map(user => ({
      id: user.id,
      name: user.name,
      login: user.login,
      role: user.role,
      avatar: user.avatar ?? null,
      color: user.color ?? null,
      updated_at: nowIso,
    }));

    const taskRows = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      created_by: task.createdBy,
      assigned_to: task.assignedTo,
      created_at: task.createdAt,
      deadline: task.deadline,
      planned_date: task.plannedDate ?? null,
      priority: task.priority,
      status: task.status,
      tags: task.tags ?? [],
      checklist: task.checklist ?? [],
      attachments: task.attachments ?? [],
      transferred_to: task.transferredTo ?? null,
      transferred_from: task.transferredFrom ?? null,
      sent_to_director_at: task.sentToDirectorAt ?? null,
      recurrence: task.recurrence ?? null,
      recurrence_custom_days: task.recurrenceCustomDays ?? null,
      parent_recurring_id: task.parentRecurringId ?? null,
      reaction_deadline: task.reactionDeadline ?? null,
      project_id: task.projectId ?? null,
      depends_on: task.dependsOn ?? [],
      updated_at: nowIso,
    }));

    const commentRows = tasks.flatMap(task =>
      task.comments.map(comment => ({
        id: comment.id,
        task_id: comment.taskId,
        author_id: comment.authorId,
        text: comment.text,
        created_at: comment.createdAt,
        mentions: comment.mentions ?? [],
      })),
    );

    const historyRows = tasks.flatMap(task =>
      task.history.map(entry => ({
        id: entry.id,
        task_id: entry.taskId,
        actor_id: entry.actorId,
        action: entry.action,
        from_status: entry.fromStatus ?? null,
        to_status: entry.toStatus ?? null,
        created_at: entry.createdAt,
        meta: entry.meta ?? null,
      })),
    );

    const noteRows = notes.map(note => ({
      id: note.id,
      user_id: note.userId,
      title: note.title,
      content: note.content,
      emoji: note.emoji,
      color: note.color,
      pinned: note.pinned ?? false,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    }));

    const settingsOwnerId = users.find(user => user.role === 'director')?.id ?? users[0]?.id;
    const userSettingsRows = settingsOwnerId
      ? [{
          user_id: settingsOwnerId,
          settings: {
            notifications,
            projects,
            userKBArticles,
            dashboardTodos,
          },
          updated_at: nowIso,
        }]
      : [];

    await this.syncTable('profiles', 'id', profileRows);
    await this.syncTable('tasks', 'id', taskRows);
    await this.syncTable('comments', 'id', commentRows);
    await this.syncTable('task_history', 'id', historyRows);
    await this.syncTable('notes', 'id', noteRows);
    await this.syncTable('user_settings', 'user_id', userSettingsRows);
  }
}

export function createDataService(): SupabaseDataService {
  return new SupabaseDataService();
}
