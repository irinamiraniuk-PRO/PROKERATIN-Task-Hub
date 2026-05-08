export type SyncMode = 'localStorage' | 'backend';

export interface SyncStatus {
  mode: SyncMode;
  supportsCrossDeviceSync: boolean;
  warning: string;
}

export interface StateSyncAdapter {
  status: SyncStatus;
  load: () => string | null;
  save: (payload: string) => void;
  subscribe: (onPayload: (payload: string) => void) => () => void;
}

export const LOCAL_STATE_KEY = 'prokeratin_state_v9';
const BACKEND_SYNC_BASE_URL = (import.meta.env.VITE_SYNC_BACKEND_URL ?? '').trim();
const BACKEND_SYNC_ENABLED = Boolean(BACKEND_SYNC_BASE_URL);

class LocalStorageSyncAdapter implements StateSyncAdapter {
  status: SyncStatus = {
    mode: 'localStorage',
    supportsCrossDeviceSync: false,
    warning: 'localStorage хранится только на текущем устройстве и не синхронизируется между телефоном и компьютером.',
  };

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

  subscribe(onPayload: (payload: string) => void): () => void {
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

// Backend adapter contract is prepared for future shared storage:
// GET  /sync/state/:accountId
// PUT  /sync/state/:accountId
// SSE  /sync/state/:accountId/stream
class BackendSyncAdapterPlaceholder implements StateSyncAdapter {
  status: SyncStatus = {
    mode: 'backend',
    supportsCrossDeviceSync: false,
    warning: 'Backend URL указан, но backend-синхронизация ещё не реализована в клиенте.',
  };

  load(): string | null {
    return null;
  }

  save(_payload: string): void {
    void _payload;
    // Placeholder: backend persistence will be implemented in a dedicated client.
  }

  subscribe(_onPayload: (payload: string) => void): () => void {
    void _onPayload;
    return () => undefined;
  }
}

export function createStateSyncAdapter(): StateSyncAdapter {
  if (BACKEND_SYNC_ENABLED) {
    return new BackendSyncAdapterPlaceholder();
  }
  return new LocalStorageSyncAdapter();
}
