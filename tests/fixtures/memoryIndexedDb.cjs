// Narrow IndexedDB test double for the repository's request/transaction contract.
// Real browser persistence, UI and backup round-trip are tested separately.
// Not an IndexedDB polyfill: no claim about quota, locking or durability behavior.
exports.memoryIndexedDb = function memoryIndexedDb() {
  const stores = new Map();
  let currentVersion = 0;
  const database = {
    objectStoreNames: { contains: name => stores.has(name) },
    createObjectStore: name => { stores.set(name, new Map()); },
    close() {},
    transaction(names, mode) {
      const requested = Array.isArray(names) ? names : [names];
      const tx = { oncomplete: null, onerror: null, onabort: null };
      const staged = new Map(requested.map(name => [name, new Map(stores.get(name))]));
      const requests = [];
      tx.objectStore = name => {
        if (!staged.has(name)) throw new Error(`Store not in transaction: ${name}`);
        const values = staged.get(name);
        const request = operation => { const item = {}; requests.push(() => { item.result = structuredClone(operation()); item.onsuccess?.(); }); return item; };
        const writable = operation => { if (mode !== 'readwrite') throw new Error('Readonly transaction'); return request(operation); };
        return {
          get: id => request(() => values.get(id)),
          getAll: () => request(() => [...values.values()]),
          put: value => writable(() => values.set(value.id, structuredClone(value)) && value.id),
          delete: id => writable(() => { values.delete(id); }),
          clear: () => writable(() => { values.clear(); }),
        };
      };
      setImmediate(() => {
        for (const request of requests) request();
        if (mode === 'readwrite') for (const [name, values] of staged) stores.set(name, values);
        tx.oncomplete?.();
      });
      return tx;
    },
  };
  return {
    open(_name, version = 1) {
      const request = { result: database };
      setImmediate(() => { if (version > currentVersion) { request.onupgradeneeded?.({ oldVersion: currentVersion, newVersion: version }); currentVersion = version; } request.onsuccess?.(); });
      return request;
    },
  };
};
