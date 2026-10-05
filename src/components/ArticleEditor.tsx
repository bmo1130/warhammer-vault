import { useEffect, useState, type FormEvent } from 'react';
import { wikiRepository } from '../repositories/wikiRepository';
import type { ArticleTarget, WikiArticle } from '../domain/types';
import { clearEditorDraft, isTextRecord, readEditorDraft, writeEditorDraft } from '../domain/editorDraft';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import Icon from './Icon';
import EmptyState from './EmptyState';
import ConfirmAction from './ConfirmAction';
const emptyContent = { evaluation: '', tactics: '', strengths: '', weaknesses: '' };
type Content = typeof emptyContent;
const contentOf = (article?: WikiArticle): Content => article ? { evaluation: article.evaluation, tactics: article.tactics, strengths: article.strengths, weaknesses: article.weaknesses } : emptyContent;
export default function ArticleEditor({ target, label }: { target: ArticleTarget; label: string }) {
  const [article, setArticle] = useState<WikiArticle | undefined>();
  const [draft, setDraft] = useState<Content>(emptyContent);
  const [editing, setEditing] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [recovered, setRecovered] = useState(false), [draftSafe, setDraftSafe] = useState(true);
  const [confirmation, setConfirmation] = useState<'cancel' | 'delete' | null>(null);
  const draftKey = `${target.entityType}:${target.entityId}`;
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(contentOf(article));
  useUnsavedChanges(dirty);
  useEffect(() => {
    let active = true;
    setLoading(true); setEditing(false); setMessage(''); setRecovered(false);
    wikiRepository.getArticle(target).then(value => {
      if (!active) return;
      setArticle(value);
      const cached = readEditorDraft(draftKey);
      if (isTextRecord(cached, Object.keys(emptyContent))) {
        setDraft({ evaluation: cached.evaluation, tactics: cached.tactics, strengths: cached.strengths, weaknesses: cached.weaknesses });
        setEditing(true); setRecovered(true);
      } else setDraft(contentOf(value));
      setLoading(false);
    }).catch(() => { if (active) setMessage('기록을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.'); });
    return () => { active = false; };
  }, [target.entityType, target.entityId, draftKey]);
  const update = (key: keyof Content, value: string) => {
    const next = { ...draft, [key]: value };
    setDraftSafe(writeEditorDraft(draftKey, next)); setDraft(next); setMessage('');
  };
  const discard = () => {
    clearEditorDraft(draftKey); setDraft(contentOf(article)); setEditing(false); setMessage(''); setRecovered(false);
  };
  const cancel = () => { if (dirty) setConfirmation('cancel'); else discard(); };
  const fields = [{ key: 'evaluation', title: '개인 평가', placeholder: `${label}에 대한 생각을 적어보세요.` }, { key: 'tactics', title: '운용 메모', placeholder: '운용법과 조합 메모를 기록하세요.' }, { key: 'strengths', title: '장점', placeholder: '좋았던 점을 기록하세요.' }, { key: 'weaknesses', title: '단점', placeholder: '아쉬웠던 점을 기록하세요.' }] as const;
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy || loading || confirmation) return; setBusy(true);
    try { const saved = await wikiRepository.saveArticle(target, draft); setArticle(saved); setDraft(contentOf(saved)); clearEditorDraft(draftKey); setEditing(false); setRecovered(false); setMessage('저장했습니다.'); }
    catch { setMessage('저장하지 못했습니다. 초안을 유지했습니다. 저장소 상태를 확인해 주세요.'); }
    finally { setBusy(false); }
  };
  const deleteArticle = async () => {
    if (busy) return; setBusy(true);
    try { await wikiRepository.deleteArticle(target); clearEditorDraft(draftKey); setArticle(undefined); setDraft(emptyContent); setEditing(false); setRecovered(false); setMessage('삭제했습니다.'); }
    catch { setMessage('삭제하지 못했습니다.'); } finally { setBusy(false); }
  };
  return <section id="my-record" className="section article-section"><div className="section-head"><h2>내 기록</h2>{!editing && <button className="text-button" disabled={loading || busy} onClick={() => { setDraft(contentOf(article)); setEditing(true); setMessage(''); }}>{article ? '편집' : '기록 시작'} <Icon name="arrow"/></button>}</div>
    {loading ? <div className="panel muted">불러오는 중...</div> : editing ? <form className="editor panel" onSubmit={event => void save(event)}>
      <p className="draft-status" role="status">{busy ? '저장 중…' : dirty ? '저장하지 않은 변경이 있습니다.' : '변경 사항이 없습니다.'}{recovered && ' 임시 초안을 복구했습니다.'}<br/>{draftSafe ? '화면 이동 후 돌아오면 이 탭의 초안을 복구합니다. 저장하기로 기록을 확정하세요.' : '임시 초안을 보관하지 못했습니다. 화면을 이동하기 전에 저장하세요.'}</p>
      {fields.map(field => <label key={field.key}><span>{field.title}</span><textarea disabled={busy} value={draft[field.key]} onChange={event => update(field.key, event.target.value)} placeholder={field.placeholder} rows={4}/></label>)}
      <div className="editor-actions"><button className="button button-primary" disabled={busy || !!confirmation} type="submit">저장하기</button><button className="button button-quiet" disabled={busy || !!confirmation} type="button" onClick={cancel}>취소</button>{article && <button className="button button-danger" disabled={busy || !!confirmation} type="button" onClick={() => setConfirmation('delete')}>삭제</button>}</div>
      {confirmation && <ConfirmAction text={confirmation === 'delete' ? '이 항목의 개인 서술과 초안을 삭제할까요? 원본 게임 데이터는 그대로 유지됩니다.' : '저장하지 않은 초안을 버릴까요?'} confirmLabel={confirmation === 'delete' ? '삭제 확정' : '초안 버리기'} disabled={busy} onCancel={() => setConfirmation(null)} onConfirm={() => { const action = confirmation; setConfirmation(null); if (action === 'delete') void deleteArticle(); else discard(); }}/>}
    </form> : article && fields.some(field => article[field.key].trim()) ? <div className="article-view panel">{fields.filter(field => article[field.key].trim()).map(field => <div key={field.key}><h3>{field.title}</h3><p>{article[field.key]}</p></div>)}<small>마지막 수정 {new Date(article.updatedAt).toLocaleString('ko-KR')}</small></div> : <EmptyState title="아직 작성한 기록이 없습니다" text="개인 평가와 운용법을 자유롭게 적어두세요. 게임 원본 데이터와 별도로 저장됩니다."/>}
    {message && <p className="message" role="status">{message}</p>}</section>;
}
