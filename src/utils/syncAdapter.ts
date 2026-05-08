export type SyncMode = 'localStorage' | 'backend';

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

export const LOCAL_STATE_KEY = 'prokeratin_state_v9';
const SUPABASE_CACHE_KEY = 'prokeratin_backend_cache_v1';
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const SUPABASE_TABLE = (import.meta.env.VITE_SUPABASE_SYNC_TABLE ?? 'app_states').trim();
const SYNC_ACCOUNT_ID = (import.meta.env.VITE_SYNC_ACCOUNT_ID ?? 'prokeratin-shared').trim();
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_INTERVAL_MS = 30000;
const SUPABASE_SYNC_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

class LocalStorageSyncAdapter implements StateSyncAdapter {
  status: SyncStatus = {
    mode: 'localStorage',
    supportsCrossDeviceSync: false,
    warning: 'Сейчас данные хранятся локально на устройстве и не синхронизируются между телефоном и компьютером. Для синхронизации нужно подключить общую базу данных.',
  };
  requiresBootstrapBeforeSave = false;

  load(): string | null {
    try {
      return localStorage.getItem(LOCAL_STATE_KEY);
    } catch {
      return null;
    }
  }

  save(payload: string): void {
    try {
      localStorage.setItem(LOCAL_STATE_KEY, payload);
    } catch {
      // ignore storage write errors
    }
  }

  subscribe(onPayload: (payload: string | null) => void): () => void {
    // localStorage mode does not require async bootstrap from backend
    onPayload(null);

    function handleStorage(event: StorageEvent) {
      if (event.storageArea !== localStorage) return;
      if (event.key !== LOCAL_STATE_KEY) return;
      if (!event.newValue) return;
      onPayload(event.newValue);
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

class SupabaseSyncAdapter implements StateSyncAdapter {
  status: SyncStatus = {
    mode: 'backend',
    supportsCrossDeviceSync: true,
    warning: '',
  };
  requiresBootstrapBeforeSave = true;
  private latestPayload: string | null = null;
  private bootstrapDone = false;

  private get requestUrl(): string {
    const query = new URLSearchParams({
      account_id: `eq.${SYNC_ACCOUNT_ID}`,
      select: 'payload,updated_at',
      limit: '1',
      order: 'updated_at.desc',
    });
    return `${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_TABLE)}?${query.toString()}`;
  }

  private get headers(): HeadersInit {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  load(): string | null {
    try {
      return localStorage.getItem(SUPABASE_CACHE_KEY);
    } catch {
      return null;
    }
  }

  private cachePayload(payload: string) {
    this.latestPayload = payload;
    try {
      localStorage.setItem(SUPABASE_CACHE_KEY, payload);
    } catch {
      // ignore cache write errors
    }
  }

  private async fetchLatestPayload(): Promise<{ payload: string | null; errored: boolean }> {
    try {
      const response = await fetch(this.requestUrl, {
        method: 'GET',
        headers: this.headers,
      });
      if (!response.ok) return { payload: null, errored: true };
      const rows = await response.json() as Array<{ payload?: unknown; updated_at?: string }>;
      if (!rows.length) return { payload: null, errored: false };
      const row = rows[0];
      const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : '';
      if (!updatedAt || row.payload == null) return { payload: null, errored: false };
      const payload = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
      return { payload, errored: false };
    } catch {
      return { payload: null, errored: true };
    }
  }

  save(_payload: string): void {
    this.cachePayload(_payload);
    const body = JSON.stringify({
      account_id: SYNC_ACCOUNT_ID,
      payload: _payload,
    });
    void fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_TABLE)}`, {
      method: 'POST',
      headers: {
        ...this.headers,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body,
    })
      .then(() => undefined)
      .catch(() => {
        // ignore network errors; next save/poll will retry
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
      const remote = await this.fetchLatestPayload();
      if (remote.errored) {
        // keep waiting for first successful backend read to avoid blind overwrite
        pollDelay = Math.min(pollDelay * 2, MAX_POLL_INTERVAL_MS);
        return;
      }
      pollDelay = POLL_INTERVAL_MS;
      if (!remote.payload) {
        emitBootstrapDone();
        return;
      }
      if (remote.payload !== this.latestPayload) {
        this.cachePayload(remote.payload);
        onPayload(remote.payload);
      } else {
        emitBootstrapDone();
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
  return new LocalStorageSyncAdapter();
}
