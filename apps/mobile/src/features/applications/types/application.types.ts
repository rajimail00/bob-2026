import type { Job, JobClientSummary } from "@/features/home/types/job.types";

export type ApplicationStatus = "pending" | "selected" | "rejected";

export interface ApplicationWorkerSummary extends JobClientSummary {}

/** Shape returned when listing applicants for a job (client view) — workerId is populated. */
export interface Application {
  _id: string;
  jobId: string;
  workerId: ApplicationWorkerSummary;
  message: string;
  voiceNoteUrl?: string;
  status: ApplicationStatus;
  createdAt: string;
}

/** Shape returned from "my applications" (worker view) — jobId is populated instead. */
export interface MyApplication {
  _id: string;
  jobId: Job;
  workerId: string;
  message: string;
  voiceNoteUrl?: string;
  status: ApplicationStatus;
  createdAt: string;
}
