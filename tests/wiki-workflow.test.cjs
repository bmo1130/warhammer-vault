const { test } = require('node:test');
const assert = require('node:assert/strict');
const { memoryIndexedDb } = require('./fixtures/memoryIndexedDb.cjs');
const { wikiRepository: wiki, parseBackup } = require('../.test-build/src/repositories/wikiRepository.js');
const { unitDiagnosticRepository: diagnostics } = require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const { gameRepository: production } = require('../.test-build/src/repositories/gameRepository.js');
const { resolveSavedTargetName } = require('../.test-build/src/repositories/archivePresentation.js');
const { pathFor } = require('../.test-build/src/domain/entities.js');
const dread = diagnostics.list().find(entry => entry.name === 'Dread Saurian');
const target = { entityType: 'unit', entityId: dread.id };
const content = { evaluation: '개인 평가입니다.', tactics: '탑승자 관찰과 내 운용 메모를 구분한다.', strengths: '내가 느낀 장점', weaknesses: '내가 느낀 단점' };

test('diagnostic target supports article create/read/update/delete, bookmark toggle and recorded views', async () => {
  global.indexedDB = memoryIndexedDb();
  assert.equal(await wiki.getArticle(target), undefined);
  assert.equal(await wiki.hasBookmark(target), false);
  await wiki.recordView(target);
  await wiki.setBookmark(target, true);
  const first = await wiki.saveArticle(target, content);
  assert.equal(first.id, `unit:${dread.id}`);
  assert.deepEqual(await wiki.getArticle(target), first);
  const updated = await wiki.saveArticle(target, { ...content, evaluation: '수정한 평가' });
  assert.equal(updated.createdAt, first.createdAt);
  assert.equal((await wiki.getArticle(target)).evaluation, '수정한 평가');
  assert.equal(await wiki.hasBookmark(target), true);
  assert.equal((await wiki.listBookmarks())[0].entityId, dread.id);
  assert.equal((await wiki.listRecent())[0].entityId, dread.id);
  assert.equal(resolveSavedTargetName((await wiki.listRecent())[0]), production.getUnit(dread.id).name);
  await wiki.setBookmark(target, false);
  await wiki.deleteArticle(target);
  assert.equal(await wiki.hasBookmark(target), false);
  assert.equal(await wiki.getArticle(target), undefined);
  assert.equal((await wiki.listRecent()).length, 1);
});

test('version 1 backup round-trips diagnostic, sample, and stale personal targets into a fresh store', async () => {
  global.indexedDB = memoryIndexedDb();
  const targets = [target, { entityType: 'unit', entityId: 'zombies' }, { entityType: 'unit', entityId: 'removed-old-id' }];
  for (const item of targets) {
    await wiki.recordView(item);
    await wiki.setBookmark(item, true);
    await wiki.saveArticle(item, content);
  }
  const exported = await wiki.exportBackup();
  assert.equal(exported.format, 'warhammer-vault-backup');
  assert.equal(exported.version, 1);
  assert.equal(exported.articles.length, 3);
  assert.equal(exported.bookmarks.length, 3);
  assert.equal(exported.recentViews.length, 3);
  const transported = parseBackup(JSON.parse(JSON.stringify(exported)));
  global.indexedDB = memoryIndexedDb();
  assert.equal((await wiki.listBookmarks()).length, 0);
  await wiki.importBackup(transported);
  const restored = await wiki.exportBackup();
  for (const key of ['articles', 'notes', 'bookmarks', 'recentViews']) assert.deepEqual(restored[key], exported[key]);
  assert.equal(resolveSavedTargetName(restored.bookmarks.find(item => item.entityId === dread.id)), production.getUnit(dread.id).name);
  assert.equal(pathFor('unit', dread.id), `/units/${dread.id}`);
  assert.equal(await wiki.hasBookmark(target), true);
  assert.equal((await wiki.getArticle(target)).evaluation, content.evaluation);
  assert.equal(resolveSavedTargetName({ entityType: 'unit', entityId: 'removed-old-id' }), undefined);
  assert.equal((await wiki.getArticle({ entityType: 'unit', entityId: 'removed-old-id' })).evaluation, content.evaluation);
});

test('old sample-only v1 backups remain valid and malformed targets fail before replacing data', async () => {
  global.indexedDB = memoryIndexedDb();
  const sample = { entityType: 'unit', entityId: 'zombies' };
  await wiki.saveArticle(sample, content);
  const legacy = JSON.parse(JSON.stringify(await wiki.exportBackup()));
  assert.equal(parseBackup(legacy).version, 1);
  await wiki.importBackup(legacy);
  const invalid = structuredClone(legacy);
  invalid.articles[0].id = 'unit:a-different-id';
  await assert.rejects(wiki.importBackup(invalid), /백업 파일 형식/);
  assert.deepEqual(await wiki.getArticle(sample), legacy.articles[0]);
});
