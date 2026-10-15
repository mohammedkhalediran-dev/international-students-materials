// tests/mock_store.mjs — مخزن في الذاكرة يحاكي واجهة lib/kv-store.mjs:
// get، set (مع metadata وttl)، delete، list(prefix). ويفرض حد KV للبيانات الوصفية (1024 بايت).
export function createMockStore() {
  const data = new Map(); // key -> { value: Buffer, metadata, expires }
  const toBuf = (v) => (typeof v === "string" ? Buffer.from(v) : Buffer.from(new Uint8Array(v)));
  const live = (k, now) => { const e = data.get(k); if (e && e.expires && e.expires <= now) { data.delete(k); return null; } return e || null; };
  const store = {
    _data: data,
    now: () => Date.now(),
    async get(key, opts = {}) {
      const e = live(key, store.now());
      if (!e) return null;
      if (opts.type === "json") return JSON.parse(e.value.toString());
      if (opts.type === "arrayBuffer") return e.value.buffer.slice(e.value.byteOffset, e.value.byteOffset + e.value.byteLength);
      return e.value.toString();
    },
    async set(key, value, opts = {}) {
      if (opts.metadata && Buffer.byteLength(JSON.stringify(opts.metadata)) > 1024) throw new Error("metadata too large");
      if (opts.ttl !== undefined && opts.ttl < 60) throw new Error("ttl below KV minimum");
      data.set(key, { value: toBuf(value), metadata: opts.metadata || {}, expires: opts.ttl ? store.now() + opts.ttl * 1000 : 0 });
    },
    async delete(key) { data.delete(key); },
    async list(prefix) {
      return [...data.keys()].filter((k) => k.startsWith(prefix) && live(k, store.now())).sort().map((k) => ({ key: k, metadata: data.get(k).metadata }));
    },
    keys(prefix = "") { return [...data.keys()].filter((k) => k.startsWith(prefix)); }
  };
  return store;
}
