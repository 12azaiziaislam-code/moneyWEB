/**
 * Tiny IndexedDB key/value cache for NON-SENSITIVE, offline-friendly data
 * (chat list, recent transactions, last computed plan, UI preferences).
 * Secrets are never stored here except the user's own AI key, which the owner
 * explicitly asked to keep on this device.
 */

const DB_NAME = 'baraka-cache';
const STORE = 'kv';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const created = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('idb_open_failed'));
  });
  dbPromise = created.catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('idb_request_failed'));
      }),
  );
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const value = await tx<unknown>('readonly', (store) => store.get(key));
    return (value as T) ?? null;
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    await tx('readwrite', (store) => store.put(value, key));
  } catch {
    /* storage may be unavailable (private mode) — the app still works */
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    await tx('readwrite', (store) => store.delete(key));
  } catch {
    /* ignore */
  }
}

export async function idbClearAll(): Promise<void> {
  try {
    await tx('readwrite', (store) => store.clear());
  } catch {
    /* ignore */
  }
}

export const CacheKeys = {
  chats: 'chats.v1',
  transactions: 'transactions.v1',
  plan: 'plan.v1',
  user: 'user.v1',
  ownKey: 'ai.ownKey.v1',
  guestToken: 'guest.token.v1',
  guestData: 'guest.data.v1',
  halalLast: 'halal.last.v2',
} as const;
