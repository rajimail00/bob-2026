import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { useLayoutEffect, useState } from "react";
import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { useJobApplicants } from "@/features/applications/hooks/useApplications";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useJob } from "@/features/home/hooks/useJobs";
import { useJobMessages } from "../hooks/useJobMessages";
import type { Message } from "../types/message.types";

interface Props {
  route: { params: { jobId: string; workerId: string } };
  navigation: { setOptions(options: { title: string }): void };
}

export function ChatScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { jobId, workerId } = route.params;
  const user = useAuthStore((state) => state.user);
  const jobQuery = useJob(jobId);
  const isOwner = jobQuery.data?.clientId._id === user?.id;
  const applicantsQuery = useJobApplicants(isOwner ? jobId : undefined);
  const { data, isLoading, isError, refetch, sendMessage, isSending } = useJobMessages(jobId, workerId);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const applicant = applicantsQuery.data?.find((item) => item.workerId._id === workerId);
  const participant = isOwner ? applicant?.workerId : jobQuery.data?.clientId;
  const participantName = `${participant?.firstName ?? ""} ${participant?.lastName ?? ""}`.trim() || t("chat.title");

  useLayoutEffect(() => {
    navigation.setOptions({ title: participantName });
  }, [navigation, participantName]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSendError(null);
    try {
      await sendMessage(trimmed);
      setText("");
    } catch {
      setSendError(t("chat.sendError"));
    }
  };

  if (isLoading || jobQuery.isLoading) return <LoadingState />;

  if (isError || jobQuery.isError || !jobQuery.data) {
    return (
      <ErrorState
        title={t("chat.loadError")}
        retryLabel={t("common.retry")}
        onRetry={() => {
          void refetch();
          void jobQuery.refetch();
        }}
      />
    );
  }

  const job = jobQuery.data;
  const locale = i18n.language || "en";
  const formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(job.date)
  );
  const formattedBudget = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(job.budget);

  return (
    <Screen padded={false}>
      <YStack paddingHorizontal="$4" paddingTop="$3" gap="$3">
        <XStack alignItems="center" gap="$3">
          <Avatar uri={participant?.photoUrl} name={participantName} size={44} />
          <YStack flex={1}>
            <Text variant="h4">{participantName}</Text>
            <Text variant="caption">{t("chat.conversation")}</Text>
          </YStack>
        </XStack>

        <Card gap="$2" padding="$3">
          <Text variant="label">{t("chat.jobContext")}</Text>
          <Text variant="body" fontWeight="600" numberOfLines={1}>
            {job.title}
          </Text>
          <XStack alignItems="center" gap="$3" flexWrap="wrap">
            <XStack alignItems="center" gap="$1">
              <Ionicons name="calendar-outline" size={14} color="#4F8266" />
              <Text variant="caption">{formattedDate}</Text>
            </XStack>
            <XStack alignItems="center" gap="$1">
              <Ionicons name="pricetag-outline" size={14} color="#4F8266" />
              <Text variant="caption">{formattedBudget}</Text>
            </XStack>
          </XStack>
        </Card>
      </YStack>

      <FlatList
        data={data ?? []}
        keyExtractor={(message) => message._id}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        renderItem={({ item }) => (
          <MessageBubble message={item} isMine={getSenderId(item) === user?.id} locale={locale} />
        )}
        ListEmptyComponent={
          <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$2">
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#4F8266" />
            <Text variant="body" muted textAlign="center">
              {t("chat.empty")}
            </Text>
          </YStack>
        }
      />

      <YStack borderTopWidth={1} borderColor="$borderColor" backgroundColor="$backgroundStrong" paddingBottom="$2">
        {sendError ? (
          <Text variant="small" color="$danger" paddingHorizontal="$3" paddingTop="$2">
            {sendError}
          </Text>
        ) : null}
        <XStack padding="$3" gap="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              placeholder={t("chat.placeholder")}
              value={text}
              onChangeText={setText}
              returnKeyType="send"
              onSubmitEditing={onSend}
            />
          </YStack>
          <Button onPress={onSend} loading={isSending} disabled={text.trim().length === 0} size="sm">
            {t("chat.send")}
          </Button>
        </XStack>
      </YStack>
    </Screen>
  );
}

function getSenderId(message: Message): string {
  return typeof message.senderId === "string" ? message.senderId : message.senderId._id;
}

function MessageBubble({ message, isMine, locale }: { message: Message; isMine: boolean; locale: string }) {
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(message.createdAt)
  );

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
        gap="$1"
      >
        <Text variant="body" color={isMine ? "$primaryText" : "$color"}>
          {message.text}
        </Text>
        <Text variant="caption" color={isMine ? "$primaryText" : "$colorMuted"} alignSelf="flex-end">
          {time}
        </Text>
      </YStack>
    </XStack>
  );
}
