export type OutboxEntry = {
  id: string;
  entity: 'clients' | 'products' | 'client_requests' | 'purchases' | 'tasks';
  entityId: string;
  op: 'upsert' | 'delete';
  payload: unknown;
  createdAt: string;
};

export type RemoteChange = {
  entity: OutboxEntry['entity'];
  entityId: string;
  op: 'upsert' | 'delete';
  payload: unknown;
  updatedAt: string;
};

/**
 * Device SQLite stays the source of truth.
 * A later worker can drain `sync_outbox` through this port into Supabase
 * or replace the SQLite driver with PowerSync without touching the touch planner.
 */
export interface SyncAdapter {
  push(entries: OutboxEntry[]): Promise<string[]>;
  pull(cursor: string | null): Promise<{ cursor: string; changes: RemoteChange[] }>;
}
