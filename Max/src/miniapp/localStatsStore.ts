/** Последний отчёт Mini App: сколько клиентов в локальной SQLite (IndexedDB) на устройстве. */
export type LocalStatsSnapshot = {
  clients: number;
  reportedAt: string;
};

const lastByMaxUser = new Map<number, LocalStatsSnapshot>();

export function setLocalStats(maxUserId: number, clients: number): void {
  lastByMaxUser.set(maxUserId, {
    clients: Math.max(0, Math.floor(clients)),
    reportedAt: new Date().toISOString(),
  });
}

export function getLocalStats(maxUserId: number): LocalStatsSnapshot | null {
  return lastByMaxUser.get(maxUserId) ?? null;
}