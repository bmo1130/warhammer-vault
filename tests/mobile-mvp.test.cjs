const {test} = require('node:test');
const assert = require('node:assert/strict');
const {gameRepository} = require('../.test-build/src/repositories/gameRepository.js');
const {researchesForUnit, researchModifiers} = require('../.test-build/src/domain/caResearchEffect.js');
const {skillsForUnit, calculateWithSkills} = require('../.test-build/src/domain/caSkillEffect.js');
const {readEditorDraft, writeEditorDraft, clearEditorDraft} = require('../.test-build/src/domain/editorDraft.js');
const projection = require('../src/data/caResearchEffect.json');

test('every admitted Research modifier and all three Skills are reachable on exact Production targets, and toggle off restores base', () => {
  const seen = new Set(), skills = new Set();
  for (const unit of gameRepository.listUnits().filter(u => u.gameVersion !== 'sample')) {
    const research = researchesForUnit(unit);
    for (const entry of research) {
      const modifiers = researchModifiers(unit, [entry.researchKey]);
      modifiers.forEach(m => seen.add(m.id));
      assert(calculateWithSkills(unit, [], [entry.researchKey], []).unit);
    }
    for (const skill of skillsForUnit(unit)) {
      skills.add(skill.skillKey);
      const result = calculateWithSkills(unit, [], research.map(r => r.researchKey), [{ skillKey: skill.skillKey, ownerKey: skill.owner.key, rank: 1 }]);
      assert.equal(result.error, '');
      assert(result.breakdown.some(b => b.modifiers.some(m => skill.modifiers.some(s => s.id === m.id))));
    }
    assert.deepEqual(calculateWithSkills(unit, [], [], []).unit, unit);
  }
  assert.deepEqual([...seen].sort(), projection.modifiers.map(m => m.id).sort());
  assert.equal(skills.size, 3);
});

test('drafts recover separately by target; corrupt/denied temporary storage fails without reporting success', () => {
  const store = new Map();
  global.sessionStorage = {getItem:k=>store.get(k) ?? null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
  const a = {evaluation:'평가', tactics:'조합', strengths:'', weaknesses:''};
  assert.equal(writeEditorDraft('unit:a', a), true);
  assert.equal(writeEditorDraft('unit:b', {...a,evaluation:'다른 유닛'}), true);
  assert.deepEqual(readEditorDraft('unit:a'), a);
  clearEditorDraft('unit:a');
  assert.equal(readEditorDraft('unit:a'), null);
  assert.equal(readEditorDraft('unit:b').evaluation, '다른 유닛');
  store.set('warhammer-vault:draft:broken', '{');
  assert.equal(readEditorDraft('broken'), null);
  global.sessionStorage = {getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('quota')},removeItem:()=>{throw Error('denied')}};
  assert.equal(writeEditorDraft('unit:a', a), false);
  assert.equal(readEditorDraft('unit:a'), null);
  assert.doesNotThrow(()=>clearEditorDraft('unit:a'));
  delete global.sessionStorage;
});
