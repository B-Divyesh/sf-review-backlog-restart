import type { AppState } from './types';

export type StorageNamespace = 'real' | 'demo';

// Demo data is held in a separate IndexedDB database. It can never overwrite
// or read a visitor's real saved plan.
const DB_NAMES: Record<StorageNamespace, string> = {
  real: 'review-backlog-restart',
  demo: 'demo:review-backlog-restart',
};
const STORE = 'plans';
const KEY = 'current';

function openDb(namespace: StorageNamespace): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAMES[namespace], 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage could not be opened.'));
  });
}

export async function loadState(namespace: StorageNamespace = 'real'): Promise<AppState | null> {
  const db = await openDb(namespace);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as AppState | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function saveState(state: AppState, namespace: StorageNamespace = 'real'): Promise<void> {
  const db = await openDb(namespace);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(state, KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearState(namespace: StorageNamespace = 'real'): Promise<void> {
  const db = await openDb(namespace);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
  });
}
