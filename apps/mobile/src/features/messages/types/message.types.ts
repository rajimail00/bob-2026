import type { ApplicationStatus } from "@/features/applications/types/application.types";
export interface MessageSenderSummary {
  _id: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

export interface Message {
  _id: string;
  jobId: string;
  workerId: string;
  senderId: MessageSenderSummary | string;
  text?: string;
  attachmentUrl?: string;
  readAt?: string;
  createdAt: string;
}

export interface ConversationWorkerSummary {
  _id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  rating?: { average: number; count: number };
}

/** Conversation information displayed with an applicant in the integrated applications list. */export interface Conversation {
  workerId: string;
  worker: ConversationWorkerSummary;
  applicationId: string;
  applicationStatus: ApplicationStatus;
  previewText?: string;
  previewAt: string;
  unreadCount: number;
}
