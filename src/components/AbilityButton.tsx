import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { abilityDictionary } from '../repositories/abilityDictionary';
import type { AbilityDetail } from '../domain/ability';
import AbilityDetails from './AbilityDetails';
type Selection = {ability: AbilityDetail; opener: HTMLButtonElement};
const PanelContext = createContext<((selection: Selection) => void) | null>(null);
function AbilityDialog({selection, close}: {selection: Selection; close: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    el.showModal();
    return () => { if (el.open) el.close(); document.body.style.overflow = previousOverflow; if (selection.opener.isConnected) selection.opener.focus({preventScroll:true}); };
  }, [selection]);
  return createPortal(<dialog ref={dialog} className="ability-dialog" aria-labelledby="ability-dialog-title" onCancel={e => {e.preventDefault(); close();}}>
    <header className="ability-dialog-header"><h2 id="ability-dialog-title">{selection.ability.name}</h2><button type="button" className="button button-secondary" onClick={close} autoFocus aria-label="능력 설명 닫기">닫기 ✕</button></header>
    <AbilityDetails ability={selection.ability} documentLink/>
  </dialog>, document.body);
}
export function AbilityPanelProvider({children}: {children: ReactNode}) {
  const [selection,setSelection] = useState<Selection | null>(null);
  return <PanelContext.Provider value={setSelection}>{children}{selection && <AbilityDialog selection={selection} close={() => setSelection(null)}/>}</PanelContext.Provider>;
}
export default function AbilityButton({id, fallback}: {id: string; fallback?: string}) {
  const open = useContext(PanelContext), [selection,setSelection] = useState<Selection | null>(null);
  const ability = abilityDictionary.get(id);
  if (!ability) return <span>{fallback ?? id}</span>;
  return <><button type="button" className="ability-button" aria-haspopup="dialog" onClick={e => (open ?? setSelection)({ability,opener:e.currentTarget})}>{ability.name}</button>
    {selection && <AbilityDialog selection={selection} close={() => setSelection(null)}/>}</>;
}
