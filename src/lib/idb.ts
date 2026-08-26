import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Tree } from '../types/tree.ts';

export type MutationOp = 'create' | 'update' | 'delete';

export interface PendingMutation {
  id?: number;
  op: MutationOp;
  clientId: string;
  payload: Partial<Tree>;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  enqueuedAt: number;
}

export interface PendingPhoto {
  clientId: string;
  blob: Blob;
  contentType: string;
}

interface LocalijamboDB extends DBSchema {
  trees_cache: {
    key: string;
    value: Tree;
  };
  pending_mutations: {
    key: number;
    value: PendingMutation;
    indexes: { clientId: string };
  };
  pending_photos: {
    key: string;
    value: PendingPhoto;
  };
}

const DB_NAME = 'localijambo';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LocalijamboDB>> | null = null;

function getDb(): Promise<IDBPDatabase<LocalijamboDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LocalijamboDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('trees_cache', { keyPath: 'clientId' });
        const mutations = db.createObjectStore('pending_mutations', {
          keyPath: 'id',
          autoIncrement: true,
        });
        mutations.createIndex('clientId', 'clientId');
        db.createObjectStore('pending_photos', { keyPath: 'clientId' });
      },
    });
  }
  return dbPromise;
}

type StoreName = 'trees_cache' | 'pending_mutations' | 'pending_photos';

export async function idbPut<K extends StoreName>(
  store: K,
  value: LocalijamboDB[K]['value'],
): Promise<LocalijamboDB[K]['key']> {
  const db = await getDb();
  return db.put(store, value);
}

export async function idbGet<K extends StoreName>(
  store: K,
  key: LocalijamboDB[K]['key'],
): Promise<LocalijamboDB[K]['value'] | undefined> {
  const db = await getDb();
  return db.get(store, key);
}

export async function idbGetAll<K extends StoreName>(
  store: K,
): Promise<LocalijamboDB[K]['value'][]> {
  const db = await getDb();
  return db.getAll(store);
}

export async function idbDelete<K extends StoreName>(
  store: K,
  key: LocalijamboDB[K]['key'],
): Promise<void> {
  const db = await getDb();
  await db.delete(store, key);
}

export async function idbGetByClientId(clientId: string): Promise<PendingMutation[]> {
  const db = await getDb();
  return db.getAllFromIndex('pending_mutations', 'clientId', clientId);
}
