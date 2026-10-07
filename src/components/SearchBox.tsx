import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { createCompositionInput } from '../domain/compositionInput';

export default function SearchBox({ value, onChange, autoFocus = false, label = '팩션, 군주, 유닛 검색' }: { value: string; onChange: (value: string) => void; autoFocus?: boolean; label?: string }) {
  const controller = useRef(createCompositionInput(value));
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    controller.current.sync(value);
    setDraft(controller.current.draft);
  }, [value]);
  const update = (next: string, composing = false, finish = false) => {
    const committed = finish ? controller.current.end(next) : controller.current.update(next, composing);
    setDraft(controller.current.draft);
    if (committed !== undefined) onChange(committed);
  };
  return <label className="search-box"><Icon name="search"/><input type="search" value={draft}
    onChange={event => update(event.currentTarget.value, (event.nativeEvent as InputEvent).isComposing)}
    onCompositionStart={() => controller.current.start()}
    onCompositionUpdate={event => update(event.currentTarget.value, true)}
    onCompositionEnd={event => update(event.currentTarget.value, false, true)}
    placeholder={label} aria-label={label} autoFocus={autoFocus}/><span className="search-hint">검색</span></label>;
}
