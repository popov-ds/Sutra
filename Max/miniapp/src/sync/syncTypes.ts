/** Порядок pull/apply: родители до дочерних записей. */
export const SYNC_ENTITIES = ["client_requests", "products", "clients", "purchases", "tasks"] as const;

export type SyncEntity = (typeof SYNC_ENTITIES)[number];

const APPLY_ORDER: Record<SyncEntity, number> = {
  client_requests: 0,
  products: 1,
  clients: 2,
  purchases: 3,
  tasks: 4,
};

export type RemoteChange = {
  entity: SyncEntity;
  entityId: string;
  op: "upsert" | "delete";
  payload: unknown;
  updatedAt: string;
};

export type RemoteRecord = {
  user_id: string;
  id: string;
  updated_at: string;
  deleted_at: string | null;
  [key: string]: unknown;
};

export function sortRemoteChangesForApply<T extends { entity: SyncEntity; updatedAt: string }>(
  changes: T[],
): T[] {
  return [...changes].sort((a, b) => {
    const byEntity = APPLY_ORDER[a.entity] - APPLY_ORDER[b.entity];
    if (byEntity !== 0) return byEntity;
    return a.updatedAt.localeCompare(b.updatedAt);
  });
}

export function isRemoteNewer(localUpdatedAt: string | undefined, remoteUpdatedAt: string): boolean {
  if (!localUpdatedAt) return true;
  return remoteUpdatedAt >= localUpdatedAt;
}