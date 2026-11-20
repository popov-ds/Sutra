import { DomainError } from "./validate.js";

export function assertCourseDuration(durationDays: number): number {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
    throw new DomainError("duration_range");
  }
  return durationDays;
}