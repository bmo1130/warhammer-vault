import { useEffect, useState, type FormEvent } from 'react';
import { wikiRepository } from '../repositories/wikiRepository';
import type { ArticleTarget, WikiArticle } from '../domain/types';
import Icon from './Icon';
import EmptyState from './EmptyState';
const emptyContent = { evaluation: '', tactics: '', strengths: '', weaknesses: '' };
type Content = typeof emptyContent;
export default function ArticleEditor({ target, label }: { target: ArticleTarget; label: string }) {
  const [article, setArticle] = useState<WikiArticle | undefined>();
  const [draft, setDraft] = useState<Content>(emptyContent);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; setLoading(true); wikiRepository.getArticle(target).then((value) => { if (active) { setArticle(value); setDraft(value ? { evaluation: value.evaluation, tactics: value.tactics, strengths: value.strengths, weaknesses: value.weaknesses } : emptyContent); setLoading(false); } }).catch(() => { if (active) { setMessage('기록을 불러오지 못했습니다.'); setLoading(false); } }); return () => { active = false; }; }, [target.entityType, target.entityId]);
  const fields = [{ key: 'evaluation', title: '개인 평가', placeholder: `${label}에 대한 생각을 적어보세요.` }, { key: 'tactics', title: '운용 메모', placeholder: '전투와 캠페인에서 어떻게 운용할까요?' }, { key: 'strengths', title: '장점', placeholder: '좋았던 점을 기록하세요.' }, { key: 'weaknesses', title: '단점', placeholder: '아쉬웠던 점을 기록하세요.' }] as const;
  const save = async (event: FormEvent) => { event.preventDefault(); try { const saved = await wikiRepository.saveArticle(target, draft); setArticle(saved); setEditing(false); setMessage('저장했습니다.'); } catch { setMessage('저장하지 못했습니다. 저장소 상태를 확인해 주세요.'); } };
  const deleteArticle = async () => { if (!window.confirm('이 항목의 개인 서술을 삭제할까요?')) return; try { await wikiRepository.deleteArticle(target); setArticle(undefined); setDraft(emptyContent); setEditing(false); setMessage('삭제했습니다.'); } catch { setMessage('삭제하지 못했습니다.'); } };
  return <section className="section article-section"><div className="section-head"><h2>내 기록</h2>{!editing && <button className="text-button" onClick={() => { setDraft(article ? { evaluation: article.evaluation, tactics: article.tactics, strengths: article.strengths, weaknesses: article.weaknesses } : emptyContent); setEditing(true); }}>{article ? '편집' : '기록 시작'} <Icon name="arrow"/></button>}</div>{loading ? <div className="panel muted">불러오는 중...</div> : editing ? <form className="editor panel" onSubmit={(event) => void save(event)}>{fields.map((field) => <label key={field.key}><span>{field.title}</span><textarea value={draft[field.key]} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} placeholder={field.placeholder} rows={4}/></label>)}<div className="editor-actions"><button className="button button-primary" type="submit">저장하기</button><button className="button button-quiet" type="button" onClick={() => { setEditing(false); setMessage(''); }}>취소</button>{article && <button className="button button-danger" type="button" onClick={() => void deleteArticle()}>삭제</button>}</div></form> : article && fields.some((field) => article[field.key].trim()) ? <div className="article-view panel">{fields.filter((field) => article[field.key].trim()).map((field) => <div key={field.key}><h3>{field.title}</h3><p>{article[field.key]}</p></div>)}<small>마지막 수정 {new Date(article.updatedAt).toLocaleDateString('ko-KR')}</small></div> : <EmptyState title="아직 작성한 기록이 없습니다" text="개인 평가와 운용법을 자유롭게 적어두세요. 게임 원본 데이터와 별도로 저장됩니다."/>}{message && <p className="message" role="status">{message}</p>}</section>;
}
