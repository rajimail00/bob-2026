import { useState } from "react";
import { FlatList } from "react-native";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useJobMessages } from "../hooks/useJobMessages";
import type { Message } from "../types/message.types";

interface Props {
  route: { params: { jobId: string; workerId: string } };
}

export function ChatScreen({ route }: Props) {
  const { jobId, workerId } = route.params;
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading, isError, refetch, sendMessage, isSending } = useJobMessages(jobId, workerId);
  const [text, setText] = useState("");

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await sendMessage(trimmed);
  };

  if (isLoading) return <LoadingState />;
  if (isError) {
    return <ErrorState title="Couldn't load messages" retryLabel="Try again" onRetry={() => refetch()} />;
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data ?? []}
        keyExtractor={(message) => message._id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => <MessageBubble message={item} isMine={getSenderId(item) === userId} />}
        ListEmptyComponent={
          <Text variant="body" muted textAlign="center">
            No messages yet — say hello.
          </Text>
        }
      />

      <XStack padding="$3" gap="$2" borderTopWidth={1} borderColor="$borderColor" alignItems="center">
        <YStack flex={1}>
          <Input placeholder="Message…" value={text} onChangeText={setText} returnKeyType="send" onSubmitEditing={onSend} />
        </YStack>
        <Button onPress={onSend} loading={isSending} disabled={text.trim().length === 0}>
          Send
        </Button>
      </XStack>
    </Screen>
  );
}

function getSenderId(message: Message): string {
  return typeof message.senderId === "string" ? message.senderId : message.senderId._id;
}

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <XStack justifyContent={isMine ? "flex-end" : "flex-start"}>
      <YStack
        maxWidth="80%"
        backgroundColor={isMine ? "$primary" : "$backgroundStrong"}
        borderWidth={isMine ? 0 : 1}
        borderColor="$borderColor"
        borderRadius="$md"
        paddingHorizontal="$3"
        paddingVertical="$2"
      >
        <Text variant="body" color={isMine ? "$primaryText" : "$color"}>
          {message.text}
        </Text>
      </YStack>
    </XStack>
  );
}
