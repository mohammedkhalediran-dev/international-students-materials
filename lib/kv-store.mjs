// lib/kv-store.mjs — يحوّل Cloudflare KV إلى واجهة المخزن التي يتوقعها lib/upload-core.mjs.
export function kvStore(kv) {
  return {
    async get(key, opts = {}) {
      return kv.get(key, opts.type === "json" ? "json" : opts.type === "arrayBuffer" ? "arrayBuffer" : "text");
    },
    async set(key, value, opts = {}) {
      const o = {};
      if (opts.metadata) o.metadata = opts.metadata;
      if (opts.ttl) o.expirationTtl = Math.max(60, opts.ttl); // أقل مدة يقبلها KV: 60 ثانية
      await kv.put(key, value, o);
    },
    async delete(key) { await kv.delete(key); },
    async list(prefix) {
      const out = [];
      let cursor;
      do {
        const r = await kv.list({ prefix, cursor });
        for (const k of r.keys) out.push({ key: k.name, metadata: k.metadata || {} });
        cursor = r.list_complete ? undefined : r.cursor;
      } while (cursor);
      return out;
    }
  };
}
