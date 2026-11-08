import type { AuditEvent } from '../shared/contract';
import type { Store } from './store';

const SENSITIVE = /pass|secret|token|cookie|credential|authorization|key/i;

/** يحذف المفاتيح الحساسة ويقتطع النصوص الطويلة قبل التخزين. */
export function sanitize(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta ?? {})) {
    if (SENSITIVE.test(k)) continue;
    if (typeof v === 'string') out[k] = v.length > 200 ? v.slice(0, 200) + '…' : v;
    else if (typeof v === 'number' || typeof v === 'boolean' || v === null) out[k] = v;
  }
  return out;
}

export class AuditLog {
  constructor(private readonly store: Store) {}

  log(eventType: string, entityType: string, entityId: string | null, metadata?: Record<string, unknown>): void {
    try {
      this.store.db
        .prepare('INSERT INTO audit_events (event_type, entity_type, entity_id, timestamp, metadata) VALUES (?,?,?,?,?)')
        .run(eventType, entityType, entityId, Date.now(), JSON.stringify(sanitize(metadata)));
    } catch (e) {
      console.error('[audit] failed', e instanceof Error ? e.message : e);
    }
  }

  list(limit: number): AuditEvent[] {
    const rows = this.store.db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?').all(limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as number,
      eventType: r.event_type as string,
      entityType: r.entity_type as string,
      entityId: (r.entity_id as string | null) ?? null,
      timestamp: r.timestamp as number,
      metadata: JSON.parse(r.metadata as string) as Record<string, unknown>,
    }));
  }
}
