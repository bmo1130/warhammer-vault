import { useState, type ChangeEvent } from 'react';
import { parseBackup, wikiRepository } from '../repositories/wikiRepository';
import { BACKUP_FILENAME } from '../domain/appIdentity';
import { clearAllEditorDrafts } from '../domain/editorDraft';
import type { UserBackup } from '../domain/types';
import PageIntro from '../components/PageIntro';
import Icon from '../components/Icon';
import ConfirmAction from '../components/ConfirmAction';
export default function SettingsPage() {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [pending, setPending] = useState<UserBackup | null>(null);
  const download = async () => {
    setBusy(true);
    try {
      const backup = await wikiRepository.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = BACKUP_FILENAME; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('백업 파일 다운로드를 요청했습니다. 다운로드 폴더를 확인하세요.');
    } catch { setMessage('백업 파일을 만들지 못했습니다.'); } finally { setBusy(false); }
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setBusy(true); setPending(null); setMessage('');
    try { setPending(parseBackup(JSON.parse(await file.text()) as unknown)); }
    catch (error) { setMessage(error instanceof Error ? error.message : '파일을 읽지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const restore = async () => {
    if (!pending || busy) return; setBusy(true);
    try { await wikiRepository.importBackup(pending); clearAllEditorDrafts(); setPending(null); setMessage('복원을 완료했습니다. 다른 화면을 열면 데이터가 갱신됩니다.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '파일을 복원하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  return <><PageIntro eyebrow="YOUR DATA" title="백업 및 복원" description="개인 기록은 이 브라우저에 저장됩니다. 다른 기기에서 쓰려면 백업 파일을 옮겨 복원하세요."/><div className="settings-grid"><section className="panel setting-card"><div className="setting-icon"><Icon name="book"/></div><h2>JSON 백업</h2><p>개인 서술, 메모, 즐겨찾기, 최근 본 항목, 수동 Modifier Profile을 한 파일로 저장합니다. 저장하기로 확정하지 않은 임시 초안은 포함되지 않습니다.</p><button className="button button-primary" disabled={busy} onClick={() => void download()}>백업 파일 받기 <Icon name="arrow"/></button></section><section className="panel setting-card"><div className="setting-icon"><Icon name="note"/></div><h2>백업 복원</h2><p>기존 개인 데이터를 백업 파일의 내용으로 교체합니다. 복원 전에 현재 데이터를 백업하세요.</p><label className={`button button-secondary file-button ${busy ? 'disabled' : ''}`}>파일 선택<input type="file" accept="application/json,.json" disabled={busy} onChange={event => void importFile(event)}/><Icon name="arrow"/></label></section></div>
    {pending && <ConfirmAction text={`서술 ${pending.articles.length}개 · 메모 ${pending.notes.length}개 · 즐겨찾기 ${pending.bookmarks.length}개 · 최근 ${pending.recentViews.length}개 · Profile ${pending.manualModifierProfiles?.length ?? 0}개로 현재 개인 데이터를 교체할까요? 이전 백업에 Profile이 없으면 저장된 Profile은 비워집니다. 이 탭의 임시 초안도 비웁니다.`} confirmLabel="복원 확정" disabled={busy} onConfirm={() => void restore()} onCancel={() => setPending(null)}/>}
    {message && <p className="message" role="status">{message}</p>}<div className="settings-foot">게임 원본 데이터는 백업에 포함되지 않습니다. 앱에 포함된 읽기 전용 JSON에서 제공됩니다.</div></>;
}
