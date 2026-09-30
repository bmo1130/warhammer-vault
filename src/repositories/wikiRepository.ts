import type { ArticleTarget, Bookmark, RecentView, UserBackup, UserNote, WikiArticle } from '../domain/types';

const DB_NAME = 'hammer-archive';
const DB_VERSION = 1;
type StoreName = 'articles' | 'notes' | 'bookmarks' | 'recentViews';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['articles', 'notes', 'bookmarks', 'recentViews'] as StoreName[]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(store: StoreName, mode: IDBTransactionMode, action: (objectStore: IDBObjectStore, resolve: (value: T) => void, reject: (reason: unknown) => void) => void): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
    action(tx.objectStore(store), resolve, reject);
  });
}

function get<T>(store: StoreName, id: string): Promise<T | undefined> {
  return transact(store, 'readonly', (objectStore, resolve, reject) => {
    const request = objectStore.get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}
function all<T>(store: StoreName): Promise<T[]> {
  return transact(store, 'readonly', (objectStore, resolve, reject) => {
    const request = objectStore.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}
async function write(store: StoreName, operation: (objectStore: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    operation(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
function put<T>(store: StoreName, value: T): Promise<void> { return write(store, (objectStore) => { objectStore.put(value); }); }
function remove(store: StoreName, id: string): Promise<void> { return write(store, (objectStore) => { objectStore.delete(id); }); }

const targetId = ({ entityType, entityId }: ArticleTarget) => `${entityType}:${entityId}`;
const allowedTypes = ['faction', 'lord', 'hero', 'unit', 'research', 'building', 'landmark'];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const validTarget = (value: Record<string, unknown>) => allowedTypes.includes(String(value.entityType)) && isString(value.entityId) && value.entityId.length > 0;
const validArticle = (value: unknown): value is WikiArticle => isRecord(value) && validTarget(value) && value.id === targetId(value as ArticleTarget) && ['evaluation', 'tactics', 'strengths', 'weaknesses', 'createdAt', 'updatedAt'].every((key) => isString(value[key]));
const validNote = (value: unknown): value is UserNote => isRecord(value) && isString(value.id) && isString(value.title) && isString(value.body) && isString(value.createdAt) && isString(value.updatedAt) && (value.entity === undefined || (isRecord(value.entity) && validTarget(value.entity)));
const validBookmark = (value: unknown): value is Bookmark => isRecord(value) && validTarget(value) && value.id === targetId(value as ArticleTarget) && isString(value.createdAt);
const validRecent = (value: unknown): value is RecentView => isRecord(value) && validTarget(value) && value.id === targetId(value as ArticleTarget) && isString(value.viewedAt);

export function parseBackup(value: unknown): UserBackup {
  if (!isRecord(value) || value.format !== 'hammer-archive-backup' || value.version !== 1 || !isString(value.exportedAt) || !Array.isArray(value.articles) || !value.articles.every(validArticle) || !Array.isArray(value.notes) || !value.notes.every(validNote) || !Array.isArray(value.bookmarks) || !value.bookmarks.every(validBookmark) || !Array.isArray(value.recentViews) || !value.recentViews.every(validRecent)) {
    throw new Error('이 앱의 백업 파일 형식이 아닙니다.');
  }
  return value as UserBackup;
}

export const wikiRepository = {
  getArticle: (target: ArticleTarget) => get<WikiArticle>('articles', targetId(target)),
  async saveArticle(target: ArticleTarget, content: Pick<WikiArticle, 'evaluation' | 'tactics' | 'strengths' | 'weaknesses'>) {
    const previous = await get<WikiArticle>('articles', targetId(target));
    const now = new Date().toISOString();
    const article: WikiArticle = { ...target, ...content, id: targetId(target), createdAt: previous?.createdAt ?? now, updatedAt: now };
    await put('articles', article);
    return article;
  },
  deleteArticle: (target: ArticleTarget) => remove('articles', targetId(target)),
  listNotes: async () => (await all<UserNote>('notes')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  saveNote: (note: UserNote) => put('notes', note),
  deleteNote: (id: string) => remove('notes', id),
  listBookmarks: async () => (await all<Bookmark>('bookmarks')).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  hasBookmark: async (target: ArticleTarget) => Boolean(await get<Bookmark>('bookmarks', targetId(target))),
  setBookmark: (target: ArticleTarget, enabled: boolean) => enabled ? put<Bookmark>('bookmarks', { ...target, id: targetId(target), createdAt: new Date().toISOString() }) : remove('bookmarks', targetId(target)),
  listRecent: async () => (await all<RecentView>('recentViews')).sort((a, b) => b.viewedAt.localeCompare(a.viewedAt)).slice(0, 8),
  recordView: (target: ArticleTarget) => put<RecentView>('recentViews', { ...target, id: targetId(target), viewedAt: new Date().toISOString() }),
  async exportBackup(): Promise<UserBackup> {
    const [articles, notes, bookmarks, recentViews] = await Promise.all([all<WikiArticle>('articles'), all<UserNote>('notes'), all<Bookmark>('bookmarks'), all<RecentView>('recentViews')]);
    return { format: 'hammer-archive-backup', version: 1, exportedAt: new Date().toISOString(), articles, notes, bookmarks, recentViews };
  },
  async importBackup(raw: unknown): Promise<void> {
    const backup = parseBackup(raw);
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['articles', 'notes', 'bookmarks', 'recentViews'], 'readwrite');
      for (const [name, entries] of [['articles', backup.articles], ['notes', backup.notes], ['bookmarks', backup.bookmarks], ['recentViews', backup.recentViews]] as const) {
        const store = tx.objectStore(name);
        store.clear();
        for (const entry of entries) store.put(entry);
      }
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    });
  },
};
