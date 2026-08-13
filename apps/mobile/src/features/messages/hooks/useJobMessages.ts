import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { messagesApi } from "../api/messages.api";
import type { Message } from "../types/message.types";

const queryKey = (jobId: string, workerId: string) => ["messages", jobId, workerId];

/**
 * REST loads history; the socket room delivers new messages live from the other participant.
 * Sending always goes through REST (guaranteed persistence) — the server's broadcast then
 * updates every connected client, including this one, deduped by message id.
 */
export function useJobMessages(jobId: string, workerId: string) {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const query = useQuery({
    queryKey: queryKey(jobId, workerId),
    queryFn: () => messagesApi.listForConversation(jobId, workerId),
  });

  useEffect(() => {
    const socket = getSocket();
    socket.emit("job:join", { jobId, workerId });

    const onNewMessage = (message: Message) => {
      if (message.jobId !== jobId || message.workerId !== workerId) return;
      queryClient.setQueryData<Message[]>(queryKey(jobId, workerId), (current) => {
        if (!current) return [message];
        if (current.some((m) => m._id === message._id)) return current;
        return [...current, message];
      });
    };

    socket.on("message:new", onNewMessage);

    return () => {
      socket.emit("job:leave", { jobId, workerId });
      socket.off("message:new", onNewMessage);
    };
  }, [jobId, workerId, queryClient]);

  const sendMessage = async (text: string) => {
    setIsSending(true);
    try {
      await messagesApi.send(jobId, workerId, { text });
    } finally {
      setIsSending(false);
    }
  };

  return { ...query, sendMessage, isSending };
}
