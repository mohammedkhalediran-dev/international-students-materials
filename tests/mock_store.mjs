// tests/mock_store.mjs — مخزن في الذاكرة يحاكي واجهة @netlify/blobs التي نستخدمها فقط
// (get، getWithMetadata، getMetadata، set مع onlyIfMatch وonlyIfNew، delete).
export function createMockStore() {
  const data = new Map(); // key -> { value: Buffer, etag, metadata }
  let counter = 0;
  const toBuf = (v) => (typeof v === "string" ? Buffer.from(v) : Buffer.from(new Uint8Array(v)));
  const shape = (value, type) => {
    if (type === "json") return JSON.parse(value.toString());
    if (type === "arrayBuffer") return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    return value.toString();
  };
  return {
    _data: data,
    async get(key, opts = {}) {
      const e = data.get(key);
      return e ? shape(e.value, opts.type) : null;
    },
    async getWithMetadata(key, opts = {}) {
      const e = data.get(key);
      return e ? { data: shape(e.value, opts.type), etag: e.etag, metadata: e.metadata } : null;
    },
    async getMetadata(key) {
      const e = data.get(key);
      return e ? { etag: e.etag, metadata: e.metadata } : null;
    },
    async set(key, value, opts = {}) {
      const cur = data.get(key);
      if (opts.onlyIfNew && cur) return { modified: false };
      if (opts.onlyIfMatch && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
      const etag = "e" + ++counter;
      data.set(key, { value: toBuf(value), etag, metadata: opts.metadata || {} });
      return { modified: true, etag };
    },
    async delete(key) { data.delete(key); },
    keys(prefix = "") { return [...data.keys()].filter((k) => k.startsWith(prefix)); }
  };
}
