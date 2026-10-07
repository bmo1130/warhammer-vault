// Keep editable text synchronous while route-backed queries may arrive later.
// Complete strings replace the draft; composition fragments are never appended.
export function createCompositionInput(value: string) {
  let draft = value, published = value, composing = false;
  const pending = new Set<string>();
  const commit = (next: string): string | undefined => {
    draft = next;
    if (next === published) return undefined;
    published = next;
    pending.add(next);
    return next;
  };
  return {
    get draft() { return draft; },
    sync(next: string) {
      // A delayed URL acknowledgement must not roll back a newer draft.
      if (pending.has(next)) {
        if (next === published) pending.clear(); else pending.delete(next);
        return;
      }
      pending.clear(); published = next;
      if (!composing) draft = next;
    },
    start() { composing = true; },
    update(next: string, nativeComposing = false) {
      draft = next;
      if (nativeComposing) composing = true;
      return composing ? undefined : commit(next);
    },
    end(next: string) { composing = false; return commit(next); },
  };
}
