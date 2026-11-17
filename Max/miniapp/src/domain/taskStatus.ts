import { compareIsoDates } from "./dates.js";

export type TaskStatus = "pending" | "done" | "overdue" | "skipped";

export function effectiveStatus(status: TaskStatus, touchOn: string, today: string): TaskStatus {
  if (status === "done" || status === "skipped") return status;
  if (compareIsoDates(touchOn, today) < 0) return "overdue";
  return "pending";
}