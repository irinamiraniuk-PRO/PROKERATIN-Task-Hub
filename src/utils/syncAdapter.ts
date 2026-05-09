import type { DashboardTodoItem } from '../types';
import { createDataService, type PersistedStateData } from './dataService';
import { hasSupabaseConfig } from './supabaseClient';

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
  subscribe: (
    onPayload: (payload: string | null) => void,
    onStatusChange?: (status: SyncStatus) => void,
  ) => () => void;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_INTERVAL_MS = 30000;
const LEGACY_STORAGE_KEY_PATTERNS = ['prokeratin', 'task', 'hub', 'state', 'sync', 'backup'];
const LEGACY_LOCAL_STORAGE_IGNORED = ['prokeratin_session_user_v1'];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDashboardTodoItem(value: unknown): value is DashboardTodoItem {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.text === 'string'
    && typeof value.done === 'boolean';
}

function normalizeDashboardTodos(value: unknown): Record<string, DashboardTodoItem[]> {
  if (!isObject(value)) return {};
  const normalized: Record<string, DashboardTodoItem[]> = {};
  Object.entries(value).forEach(([userId, items]) => {
    if (!Array.isArray(items)) return;
    // Intentionally permissive for migration: keep valid items, silently drop malformed fields/items.
    normalized[userId] = items.filter(isDashboardTodoItem);
  });
  return normalized;
}

function parsePayloadData(payload: string): PersistedStateData | null {
  try {
    const parsed = JSON.parse(payload) as { data?: unknown } | Record<string, unknown>;
    const data = isObject(parsed) && 'data' in parsed && isObject(parsed.data) ? parsed.data : parsed;
    if (!isObject(data)) return null;
    return data as PersistedStateData;
  } catch {
    return null;
  }
}

function toPayload(data: PersistedStateData): string {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  });
}

function fingerprint(data: PersistedStateData): string {
  return JSON.stringify(data);
}

function normalizeLegacyData(value: unknown): PersistedStateData | null {
  if (!isObject(value)) return null;
  const raw = isObject(value.data) ? value.data : value;
  if (!isObject(raw)) return null;
  const looksLikeState =
    Array.isArray(raw.users)
    || Array.isArray(raw.tasks)
    || Array.isArray(raw.notes)
    || Array.isArray(raw.notifications)
    || Array.isArray(raw.projects)
    || Array.isArray(raw.userKBArticles)
    || isObject(raw.dashboardTodos);
  if (!looksLikeState) return null;
  return {
    users: Array.isArray(raw.users) ? raw.users : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    userKBArticles: Array.isArray(raw.userKBArticles) ? raw.userKBArticles : [],
    dashboardTodos: normalizeDashboardTodos(raw.dashboardTodos),
  };
}

function readLegacyLocalData(): PersistedStateData | null {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (LEGACY_LOCAL_STORAGE_IGNORED.includes(key)) continue;
      const normalizedKey = key.toLowerCase();
      // Broad substring matching is intentional to recover keys from pre-Supabase builds
      // (v1 local-only and early v2 hybrid builds that used ad-hoc localStorage names).
      // Remove this fallback after legacy migration support sunset (planned after 2026 Q4).
      const isLikelyTaskHubKey = LEGACY_STORAGE_KEY_PATTERNS.some(hint => normalizedKey.includes(hint));
      if (!isLikelyTaskHubKey) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = normalizeLegacyData(JSON.parse(raw));
        if (parsed) return parsed;
      } catch {
        // ignore non-json localStorage values
      }
    }
  } catch {
    return null;
  }
  return null;
}

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
  }

  subscribe(
    onPayload: (payload: string | null) => void,
    onStatusChange?: (status: SyncStatus) => void,
  ): () => void {
    onStatusChange?.(this.status);
    onPayload(null);
    return () => {};
  }
}

class SupabaseSyncAdapter implements StateSyncAdapter {
  status: SyncStatus = {
    mode: 'unavailable',
    supportsCrossDeviceSync: false,
    warning: 'Синхронизация недоступна: нет соединения с Supabase',
  };

  requiresBootstrapBeforeSave = true;
  private latestFingerprint = '';
  private bootstrapDone = false;
  private migrationAttempted = false;
  private dataService = createDataService();
  private onStatusChange?: (status: SyncStatus) => void;

  private setStatus(nextStatus: SyncStatus) {
    if (
      this.status.mode === nextStatus.mode
      && this.status.supportsCrossDeviceSync === nextStatus.supportsCrossDeviceSync
      && this.status.warning === nextStatus.warning
    ) {
      return;
    }
    this.status = nextStatus;
    this.onStatusChange?.(this.status);
  }

  private emitBootstrapDone(onPayload: (payload: string | null) => void) {
    if (this.bootstrapDone) return;
    this.bootstrapDone = true;
    onPayload(null);
  }

  private emitData(onPayload: (payload: string | null) => void, data: PersistedStateData) {
    this.latestFingerprint = fingerprint(data);
    onPayload(toPayload(data));
  }

  load(): string | null {
    return null;
  }

  save(payload: string): void {
    const data = parsePayloadData(payload);
    if (!data) return;
    this.latestFingerprint = fingerprint(data);
    void this.dataService.pushStateData(data).catch((error) => {
      console.error('Supabase sync save failed', error);
    });
  }

  subscribe(
    onPayload: (payload: string | null) => void,
    onStatusChange?: (status: SyncStatus) => void,
  ): () => void {
    let disposed = false;
    let timerId: number | null = null;
    let pollDelay = POLL_INTERVAL_MS;
    this.onStatusChange = onStatusChange;
    this.onStatusChange?.(this.status);

    const poll = async () => {
      try {
        const data = await this.dataService.fetchStateData();
        this.setStatus({
          mode: 'backend',
          supportsCrossDeviceSync: true,
          warning: '',
        });
        pollDelay = POLL_INTERVAL_MS;

        if (!data) {
          if (!this.migrationAttempted) {
            this.migrationAttempted = true;
            const legacyData = readLegacyLocalData();
            if (legacyData) {
              this.emitData(onPayload, legacyData);
              return;
            }
          }
          this.emitBootstrapDone(onPayload);
          return;
        }

        const nextFingerprint = fingerprint(data);
        if (nextFingerprint !== this.latestFingerprint) {
          this.emitData(onPayload, data);
        } else {
          this.emitBootstrapDone(onPayload);
        }
      } catch {
        this.setStatus({
          mode: 'unavailable',
          supportsCrossDeviceSync: false,
          warning: 'Синхронизация недоступна: нет соединения с Supabase',
        });
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
      if (this.onStatusChange === onStatusChange) {
        this.onStatusChange = undefined;
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }
}

export function createStateSyncAdapter(): StateSyncAdapter {
  if (hasSupabaseConfig) {
    return new SupabaseSyncAdapter();
  }
  return new MissingSupabaseSyncAdapter();
}
