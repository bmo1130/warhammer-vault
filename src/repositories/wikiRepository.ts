import type { ArticleTarget, Bookmark, RecentView, UserBackup, UserNote, WikiArticle } from '../domain/types';

import { APP_ID, BACKUP_FORMAT } from '../domain/appIdentity';
import { entityRoutes } from '../domain/entities';
import { parseManualModifierProfile, type ManualModifierProfile } from '../domain/manualModifierProfile';
import { comparisonUnit } from './productionUnitSelection';
import type { UnitStatModifier } from '../domain/unitModifiers';

const DB_NAME = APP_ID;
const DB_VERSION = 2;
type StoreName = 'articles' | 'notes' | 'bookmarks' | 'recentViews' | 'manualModifierProfiles';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['articles', 'notes', 'bookmarks', 'recentViews', 'manualModifierProfiles'] as StoreName[]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => { if (blocked) { request.result.close(); return; } request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onblocked = () => { blocked = true; reject(new Error('다른 탭을 닫거나 새로고침한 뒤 다시 시도하세요.')); };
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
const allowedTypes = Object.keys(entityRoutes);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const validTarget = (value: Record<string, unknown>) => allowedTypes.includes(String(value.entityType)) && isString(value.entityId) && value.entityId.length > 0;
const validArticle = (value: unknown): value is WikiArticle => isRecord(value) && validTarget(value) && value.id === targetId(value as ArticleTarget) && ['evaluation', 'tactics', 'strengths', 'weaknesses', 'createdAt', 'updatedAt'].every((key) => isString(value[key]));
const validNote = (value: unknown): value is UserNote => isRecord(value) && isString(value.id) && isString(value.title) && isString(value.body) && isString(value.createdAt) && isString(value.updatedAt) && (value.entity === undefined || (isRecord(value.entity) && validTarget(value.entity)));
const validBookmark = (value: unknown): value is Bookmark => isRecord(value) && validTarget(value) && value.id === targetId(value as ArticleTarget) && isString(value.createdAt);
const validRecent = (value: unknown): value is RecentView => isRecord(value) && validTarget(value) && value.id === targetId(value as ArticleTarget) && isString(value.viewedAt);

export function parseBackup(value: unknown): UserBackup {
  if (!isRecord(value) || value.format !== BACKUP_FORMAT || value.version !== 1 || !isString(value.exportedAt) || !Array.isArray(value.articles) || !value.articles.every(validArticle) || !Array.isArray(value.notes) || !value.notes.every(validNote) || !Array.isArray(value.bookmarks) || !value.bookmarks.every(validBookmark) || !Array.isArray(value.recentViews) || !value.recentViews.every(validRecent)) {
    throw new Error('이 앱의 백업 파일 형식이 아닙니다.');
  }
  if (value.manualModifierProfiles !== undefined && !Array.isArray(value.manualModifierProfiles)) throw new Error('잘못된 수동 Profile 백업입니다.');
  const profiles = (value.manualModifierProfiles as unknown[] | undefined ?? []).map(p => parseManualModifierProfile(p, comparisonUnit));
  if (new Set(profiles.map(p => p.id)).size !== profiles.length) throw new Error('중복된 Profile ID입니다.');
  return { ...value, manualModifierProfiles: profiles } as UserBackup;
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
  async listManualProfiles() {
    const profiles: ManualModifierProfile[] = [];
    let invalidCount = 0;
    for (const raw of await all<unknown>('manualModifierProfiles')) {
      try { profiles.push(parseManualModifierProfile(raw, comparisonUnit)); } catch { invalidCount++; }
    }
    return { profiles: profiles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), invalidCount };
  },
  async getManualProfile(id: string) {
    const raw = await get<unknown>('manualModifierProfiles', id);
    return raw === undefined ? undefined : parseManualModifierProfile(raw, comparisonUnit);
  },
  async saveManualProfile(input: { id?: string; name: string; unitId: string; modifiers: UnitStatModifier[] }) {
    const previous = input.id ? await get<ManualModifierProfile>('manualModifierProfiles', input.id) : undefined;
    if (input.id && !previous) throw new Error('저장된 Profile을 찾을 수 없습니다. 새 Profile로 저장하세요.');
    if (previous && previous.unitId !== input.unitId) throw new Error('Profile의 연결 유닛은 변경할 수 없습니다. 새 Profile을 만드세요.');
    const now = new Date().toISOString();
    const profile = parseManualModifierProfile({ id: input.id ?? crypto.randomUUID(), name: input.name, unitId: input.unitId, modifiers: input.modifiers, createdAt: previous?.createdAt ?? now, updatedAt: now }, comparisonUnit);
    await put('manualModifierProfiles', profile);
    return profile;
  },
  deleteManualProfile: (id: string) => remove('manualModifierProfiles', id),
  async exportBackup(): Promise<UserBackup> {
    const [articles, notes, bookmarks, recentViews, manualModifierProfiles] = await Promise.all([all<WikiArticle>('articles'), all<UserNote>('notes'), all<Bookmark>('bookmarks'), all<RecentView>('recentViews'), all<unknown>('manualModifierProfiles')]);
    return parseBackup({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), articles, notes, bookmarks, recentViews, manualModifierProfiles });
  },
  async importBackup(raw: unknown): Promise<void> {
    const backup = parseBackup(raw);
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['articles', 'notes', 'bookmarks', 'recentViews', 'manualModifierProfiles'], 'readwrite');
      for (const [name, entries] of [['articles', backup.articles], ['notes', backup.notes], ['bookmarks', backup.bookmarks], ['recentViews', backup.recentViews], ['manualModifierProfiles', backup.manualModifierProfiles ?? []]] as const) {
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
