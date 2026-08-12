export interface MessageSenderSummary {
  _id: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

export interface Message {
  _id: string;
  jobId: string;
  senderId: MessageSenderSummary | string;
  text?: string;
  attachmentUrl?: string;
  readAt?: string;
  createdAt: string;
}
