import { useEffect, useState, type FormEvent } from 'react';
import { wikiRepository } from '../repositories/wikiRepository';
import type { UserNote } from '../domain/types';
import { clearEditorDraft, isTextRecord, readEditorDraft, writeEditorDraft } from '../domain/editorDraft';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import PageIntro from '../components/PageIntro';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import ConfirmAction from '../components/ConfirmAction';
const draftKey = 'notes';
export default function NotesPage() {
  const [notes, setNotes] = useState<UserNote[]>([]), [editing, setEditing] = useState<UserNote | null>(null), [title, setTitle] = useState(''), [body, setBody] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [draftSafe, setDraftSafe] = useState(true);
  const [confirmation, setConfirmation] = useState<'cancel' | 'delete' | 'switch' | null>(null), [nextNote, setNextNote] = useState<UserNote | undefined>();
  const dirty = Boolean(editing && (title !== editing.title || body !== editing.body));
  useUnsavedChanges(dirty);
  const refresh = () => wikiRepository.listNotes().then(setNotes).catch(() => setMessage('메모를 불러오지 못했습니다.'));
  useEffect(() => {
    void refresh();
    const cached = readEditorDraft(draftKey);
    if (isTextRecord(cached, ['id', 'title', 'body', 'createdAt', 'updatedAt'])) {
      const note = { ...cached } as unknown as UserNote;
      setEditing({ ...note, title: '', body: '' }); setTitle(note.title); setBody(note.body); setMessage('임시 초안을 복구했습니다. 저장하기로 기록을 확정하세요.');
    }
  }, []);
  const open = (note?: UserNote) => {
    clearEditorDraft(draftKey);
    setEditing(note ?? { id: crypto.randomUUID(), title: '', body: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); setTitle(note?.title ?? ''); setBody(note?.body ?? ''); setMessage(''); setDraftSafe(true);
  };
  const start = (note?: UserNote) => { if (dirty) { setNextNote(note); setConfirmation('switch'); } else open(note); };
  const update = (nextTitle: string, nextBody: string) => {
    if (!editing) return;
    setDraftSafe(writeEditorDraft(draftKey, { ...editing, title: nextTitle, body: nextBody })); setTitle(nextTitle); setBody(nextBody); setMessage('');
  };
  const discard = () => { clearEditorDraft(draftKey); setEditing(null); setMessage(''); };
  const cancel = () => { if (dirty) setConfirmation('cancel'); else discard(); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!editing || busy || confirmation || !title.trim()) return; setBusy(true);
    try { await wikiRepository.saveNote({ ...editing, title: title.trim(), body, updatedAt: new Date().toISOString() }); clearEditorDraft(draftKey); setEditing(null); await refresh(); setMessage('메모를 저장했습니다.'); }
    catch { setMessage('메모를 저장하지 못했습니다. 초안을 유지했습니다.'); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (busy) return; setBusy(true);
    try { await wikiRepository.deleteNote(id); clearEditorDraft(draftKey); setEditing(null); await refresh(); setMessage('메모를 삭제했습니다.'); }
    catch { setMessage('메모를 삭제하지 못했습니다.'); } finally { setBusy(false); }
  };
  return <><PageIntro eyebrow="PERSONAL NOTES" title="자유 메모" description="유닛 평가, 조합 메모와 다음 캠페인에 쓸 생각을 모아두세요."/><div className="section-head"><h2>내 메모<span className="count">{notes.length}</span></h2><button className="button button-primary" disabled={busy || !!confirmation} onClick={() => start()}><Icon name="plus"/> 새 메모</button></div>
    {editing && <form className="editor panel note-editor" onSubmit={event => void save(event)}><p className="draft-status" role="status">{busy ? '저장 중…' : dirty ? '저장하지 않은 변경이 있습니다.' : '변경 사항이 없습니다.'}<br/>{draftSafe ? '화면 이동 후 돌아오면 이 탭의 초안을 복구합니다. 저장하기로 기록을 확정하세요.' : '임시 초안을 보관하지 못했습니다. 이동 전에 저장하세요.'}</p><label><span>제목</span><input required disabled={busy || !!confirmation} value={title} onChange={event => update(event.target.value, body)} placeholder="메모 제목"/></label><label><span>내용</span><textarea disabled={busy || !!confirmation} value={body} onChange={event => update(title, event.target.value)} placeholder="아이디어나 기록을 자유롭게 적어보세요." rows={8}/></label><div className="editor-actions"><button className="button button-primary" disabled={busy || !!confirmation || !title.trim()} type="submit">저장하기</button><button className="button button-quiet" disabled={busy || !!confirmation} type="button" onClick={cancel}>취소</button>{notes.some(note => note.id === editing.id) && <button className="button button-danger" disabled={busy || !!confirmation} type="button" onClick={() => setConfirmation('delete')}>삭제</button>}</div>{confirmation && <ConfirmAction text={confirmation === 'delete' ? '이 메모와 초안을 삭제할까요?' : '저장하지 않은 메모 초안을 버릴까요?'} confirmLabel={confirmation === 'delete' ? '삭제 확정' : '초안 버리기'} disabled={busy} onCancel={() => setConfirmation(null)} onConfirm={() => { const action = confirmation; setConfirmation(null); if (action === 'delete') void remove(editing.id); else if (action === 'switch') open(nextNote); else discard(); }}/>}</form>}
    {notes.length ? <div className="note-list">{notes.map(note => <button className="note-card" disabled={busy || !!confirmation} key={note.id} onClick={() => start(note)}><span className="note-date">{new Date(note.updatedAt).toLocaleDateString('ko-KR')}</span><strong>{note.title}</strong><p>{note.body || '내용이 없습니다.'}</p><span className="note-edit">편집하기 <Icon name="arrow"/></span></button>)}</div> : !editing && <EmptyState title="아직 메모가 없습니다" text="새 메모를 눌러 첫 아이디어를 기록하세요."/>}{message && <p className="message" role="status">{message}</p>}</>;
}
