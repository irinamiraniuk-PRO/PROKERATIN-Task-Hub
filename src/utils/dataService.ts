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
}

interface CommentRow {
  id: string;
  task_id: string;
  author_id: string;
  text: string;
  created_at: string;
  mentions: unknown;
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
}

interface UserSettingsRow {
  user_id: string;
  settings: unknown;
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

  private async fetchRows<T>(table: string, selectQuery: string, orderBy?: { column: string; ascending?: boolean }, limit?: number): Promise<T[]> {
    const client = this.assertClient();
    let query = client.from(table).select(selectQuery);
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

  private async deleteAll(table: string, keyColumn: string): Promise<void> {
    const client = this.assertClient();
    const { error } = await client.from(table).delete().not(keyColumn, 'is', null);
    if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
  }

  private async deleteByIds(table: string, keyColumn: string, ids: string[]): Promise<void> {
    if (!ids.length) return;
    const client = this.assertClient();
    const { error } = await client.from(table).delete().in(keyColumn, ids);
    if (error) throw new Error(`Failed to delete obsolete rows from ${table}: ${error.message}`);
  }

  private async upsertRows(table: string, rows: Record<string, unknown>[], keyColumn: string): Promise<void> {
    if (!rows.length) return;
    const client = this.assertClient();
    // Every synced table in schema.sql uses a single-column primary key.
    // `keyColumn` must match that key, because we rely on merge upserts.
    // If schema and keyColumn diverge, Supabase returns an error and sync is aborted.
    const { error } = await client.from(table).upsert(rows, { onConflict: keyColumn, ignoreDuplicates: false });
    if (error) throw new Error(`Failed to upsert ${table}: ${error.message}`);
  }

  private async syncTable(table: string, keyColumn: string, rows: Record<string, unknown>[]): Promise<void> {
    if (!rows.length) {
      await this.deleteAll(table, keyColumn);
      return;
    }

    await this.upsertRows(table, rows, keyColumn);
    const existingRows = await this.fetchRows<Record<string, unknown>>(table, keyColumn);
    const nextIds = new Set(rows.map(row => String(row[keyColumn])));
    const obsoleteIds = existingRows
      .map(row => String(row[keyColumn] ?? ''))
      .filter(id => id && !nextIds.has(id));

    await this.deleteByIds(table, keyColumn, obsoleteIds);
  }

  async fetchStateData(): Promise<PersistedStateData | null> {
    const [users, taskRows, commentRows, historyRows, noteRows, settingsRows] = await Promise.all([
      this.fetchRows<User>('users', 'id,name,login,password,role,avatar,color', { column: 'id', ascending: true }),
      this.fetchRows<TaskRow>('tasks', '*', { column: 'created_at', ascending: false }),
      this.fetchRows<CommentRow>('comments', 'id,task_id,author_id,text,created_at,mentions', { column: 'created_at', ascending: true }),
      this.fetchRows<TaskHistoryRow>('task_history', 'id,task_id,actor_id,action,from_status,to_status,created_at,meta', { column: 'created_at', ascending: true }),
      this.fetchRows<NoteRow>('notes', 'id,user_id,title,content,emoji,color,pinned,created_at,updated_at', { column: 'updated_at', ascending: false }),
      this.fetchRows<UserSettingsRow>('user_settings', 'user_id,settings', { column: 'updated_at', ascending: false }, 1),
    ]);

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

    const userRows = users.map(user => ({
      id: user.id,
      name: user.name,
      login: user.login,
      password: user.password,
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
      }))
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
      }))
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

    // user_settings stores shared app-level settings, so we persist it under one stable user key:
    // director first (most stable account), otherwise first available user.
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

    await this.syncTable('users', 'id', userRows);
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
