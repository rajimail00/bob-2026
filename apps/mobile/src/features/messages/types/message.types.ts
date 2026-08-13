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

/** One applicant's conversation preview, as seen by the job owner's NACHRICHTEN tab. */
export interface Conversation {
  workerId: string;
  worker: ConversationWorkerSummary;
  applicationId: string;
  applicationStatus: "pending" | "selected" | "rejected";
  previewText?: string;
  previewAt: string;
  unreadCount: number;
}
