import type { JobDetail, JobStatus } from "../types/job.types";

export function isEditableJobStatus(status: JobStatus) {
  return status === "draft" || status === "active";
}

export function canEditJob(job: JobDetail, userId: string | undefined) {
  return Boolean(userId && job.clientId._id === userId && isEditableJobStatus(job.status));
}

export function isRepostableJobStatus(status: JobStatus) {
  return status === "completed" || status === "cancelled" || status === "expired";
}

export function canRepostJob(job: JobDetail, userId: string | undefined) {
  return Boolean(userId && job.clientId._id === userId && isRepostableJobStatus(job.status));
}
