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

export type SyncMode = 'backend' | 'unavailable';

export interface SyncStatus {
  mode: SyncMode;
  supportsCrossDeviceSync: boolean;
  warning: string;
}

export interface StateSyncAdapter {
  status: SyncStatus;
  requiresBootstrapBeforeSave: boolean;
  load: () => string | null;
  save: (payload: string) => void;
  subscribe: (onPayload: (payload: string | null) => void) => () => void;
}

interface PersistedStateData {
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

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const SUPABASE_SYNC_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_INTERVAL_MS = 30000;

class MissingSupabaseSyncAdapter implements StateSyncAdapter {
  status: SyncStatus = {
    mode: 'unavailable',
    supportsCrossDeviceSync: false,
    warning: 'Синхронизация недоступна: не подключена база данных Supabase',
  };

  requiresBootstrapBeforeSave = false;

  load(): string | null {
    return null;
  }

  save(payload: string): void {
    void payload;
    // noop when Supabase is not configured
  }

  subscribe(onPayload: (payload: string | null) => void): () => void {
    onPayload(null);
    return () => {};
  }
}

class SupabaseSyncAdapter implements StateSyncAdapter {
  status: SyncStatus = {
    mode: 'backend',
    supportsCrossDeviceSync: true,
    warning: '',
  };

  requiresBootstrapBeforeSave = true;
  private latestFingerprint = '';
  private bootstrapDone = false;

  private get headers(): HeadersInit {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  private endpoint(table: string, query?: string): string {
    const base = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}`;
    return query ? `${base}?${query}` : base;
  }

  private parsePayload(payload: string): PersistedStateData | null {
    try {
      const parsed = JSON.parse(payload) as { data?: unknown } | Record<string, unknown>;
      const data = parsed && typeof parsed === 'object' && 'data' in parsed && parsed.data && typeof parsed.data === 'object'
        ? parsed.data
        : parsed;
      if (!data || typeof data !== 'object') return null;
      return data as PersistedStateData;
    } catch {
      return null;
    }
  }

  private toPayload(data: PersistedStateData): string {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    });
  }

  private readJson<T>(value: unknown, fallback: T): T {
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

  private fingerprint(data: PersistedStateData): string {
    return JSON.stringify(data);
  }

  private async fetchRows<T>(table: string, query: string): Promise<T[]> {
    const response = await fetch(this.endpoint(table, query), {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) throw new Error(`Failed to fetch ${table}`);
    return await response.json() as T[];
  }

  private async deleteAll(table: string, keyColumn: string): Promise<void> {
    const response = await fetch(this.endpoint(table, `${keyColumn}=not.is.null`), {
      method: 'DELETE',
      headers: {
        ...this.headers,
        Prefer: 'return=minimal',
      },
    });
    if (!response.ok) throw new Error(`Failed to delete ${table}`);
  }

  private async deleteById(table: string, keyColumn: string, value: string): Promise<void> {
    const response = await fetch(this.endpoint(table, `${keyColumn}=eq.${encodeURIComponent(value)}`), {
      method: 'DELETE',
      headers: {
        ...this.headers,
        Prefer: 'return=minimal',
      },
    });
    if (!response.ok) throw new Error(`Failed to delete row from ${table}`);
  }

  private async upsertRows(table: string, rows: unknown[]): Promise<void> {
    if (!rows.length) return;
    const response = await fetch(this.endpoint(table), {
      method: 'POST',
      headers: {
        ...this.headers,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!response.ok) throw new Error(`Failed to upsert ${table}`);
  }

  private async syncTable(table: string, keyColumn: string, rows: Array<Record<string, unknown>>): Promise<void> {
    if (!rows.length) {
      await this.deleteAll(table, keyColumn);
      return;
    }

    await this.upsertRows(table, rows);
    const existingRows = await this.fetchRows<Record<string, unknown>>(table, `select=${keyColumn}`);
    const nextIds = new Set(rows.map(row => String(row[keyColumn])));
    const obsoleteIds = existingRows
      .map(row => String(row[keyColumn] ?? ''))
      .filter(id => id && !nextIds.has(id));

    for (const id of obsoleteIds) {
      await this.deleteById(table, keyColumn, id);
    }
  }

  private isEmptyStateData(data: PersistedStateData): boolean {
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

  private async fetchStateData(): Promise<PersistedStateData | null> {
    const [users, taskRows, commentRows, historyRows, noteRows, settingsRows] = await Promise.all([
      this.fetchRows<User>('users', 'select=id,name,login,password,role,avatar,color&order=id.asc'),
      this.fetchRows<TaskRow>('tasks', 'select=*&order=created_at.desc'),
      this.fetchRows<CommentRow>('comments', 'select=id,task_id,author_id,text,created_at,mentions&order=created_at.asc'),
      this.fetchRows<TaskHistoryRow>('task_history', 'select=id,task_id,actor_id,action,from_status,to_status,created_at,meta&order=created_at.asc'),
      this.fetchRows<NoteRow>('notes', 'select=id,user_id,title,content,emoji,color,pinned,created_at,updated_at&order=updated_at.desc'),
      this.fetchRows<UserSettingsRow>('user_settings', 'select=user_id,settings&order=updated_at.desc&limit=1'),
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
        mentions: this.readJson<string[] | undefined>(row.mentions, undefined),
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
      tags: this.readJson<Task['tags']>(row.tags, []),
      comments: commentsByTaskId.get(row.id) ?? [],
      history: historyByTaskId.get(row.id) ?? [],
      checklist: this.readJson<Task['checklist']>(row.checklist, []),
      attachments: this.readJson<Task['attachments']>(row.attachments, []),
      transferredTo: row.transferred_to ?? undefined,
      transferredFrom: row.transferred_from ?? undefined,
      sentToDirectorAt: row.sent_to_director_at ?? undefined,
      recurrence: row.recurrence ?? undefined,
      recurrenceCustomDays: row.recurrence_custom_days ?? undefined,
      parentRecurringId: row.parent_recurring_id ?? undefined,
      reactionDeadline: row.reaction_deadline ?? undefined,
      projectId: row.project_id ?? undefined,
      dependsOn: this.readJson<string[]>(row.depends_on, []),
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

    const settings = this.readJson<{
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

    if (this.isEmptyStateData(data)) return null;
    return data;
  }

  private async pushStateData(data: PersistedStateData): Promise<void> {
    const nowIso = new Date().toISOString();

    const userRows = (data.users ?? []).map(user => ({
      id: user.id,
      name: user.name,
      login: user.login,
      password: user.password,
      role: user.role,
      avatar: user.avatar ?? null,
      color: user.color ?? null,
      updated_at: nowIso,
    }));

    const taskRows = (data.tasks ?? []).map(task => ({
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

    const commentRows = (data.tasks ?? []).flatMap(task =>
      task.comments.map(comment => ({
        id: comment.id,
        task_id: comment.taskId,
        author_id: comment.authorId,
        text: comment.text,
        created_at: comment.createdAt,
        mentions: comment.mentions ?? [],
      }))
    );

    const historyRows = (data.tasks ?? []).flatMap(task =>
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

    const noteRows = (data.notes ?? []).map(note => ({
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

    const settingsOwnerId = userRows[0]?.id;
    const userSettingsRows = settingsOwnerId
      ? [{
          user_id: settingsOwnerId,
          settings: {
            notifications: data.notifications ?? [],
            projects: data.projects ?? [],
            userKBArticles: data.userKBArticles ?? [],
            dashboardTodos: data.dashboardTodos ?? {},
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

  load(): string | null {
    return null;
  }

  save(payload: string): void {
    const data = this.parsePayload(payload);
    if (!data) return;
    this.latestFingerprint = this.fingerprint(data);
    void this.pushStateData(data).catch((error) => {
      console.error('Supabase sync save failed', error);
    });
  }

  subscribe(onPayload: (payload: string | null) => void): () => void {
    let disposed = false;
    let timerId: number | null = null;
    let pollDelay = POLL_INTERVAL_MS;

    const emitBootstrapDone = () => {
      if (this.bootstrapDone) return;
      this.bootstrapDone = true;
      onPayload(null);
    };

    const poll = async () => {
      try {
        const data = await this.fetchStateData();
        pollDelay = POLL_INTERVAL_MS;
        if (!data) {
          emitBootstrapDone();
          return;
        }
        const fingerprint = this.fingerprint(data);
        if (fingerprint !== this.latestFingerprint) {
          this.latestFingerprint = fingerprint;
          onPayload(this.toPayload(data));
        } else {
          emitBootstrapDone();
        }
      } catch {
        pollDelay = Math.min(pollDelay * 2, MAX_POLL_INTERVAL_MS);
      }
    };

    const loop = async () => {
      if (disposed) return;
      await poll();
      if (disposed) return;
      timerId = window.setTimeout(() => { void loop(); }, pollDelay);
    };

    void loop();

    return () => {
      disposed = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }
}

export function createStateSyncAdapter(): StateSyncAdapter {
  if (SUPABASE_SYNC_ENABLED) {
    return new SupabaseSyncAdapter();
  }
  return new MissingSupabaseSyncAdapter();
}
