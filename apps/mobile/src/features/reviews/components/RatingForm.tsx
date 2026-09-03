import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useCreateReview } from "../hooks/useReviews";

interface RatingFormProps {
  jobId: string;
  onDone: () => void;
}

export function RatingForm({ jobId, onDone }: RatingFormProps) {
  const { t } = useTranslation();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createReview = useCreateReview(jobId);

  const onSubmit = async () => {
    setError(null);
    try {
      await createReview.mutateAsync({ stars, comment: comment.trim() || undefined });
      onDone();
    } catch (err) {
      setError(getApiErrorMessage(err, t("reviews.error")));
    }
  };

  return (
    <YStack gap="$3">
      <Text variant="h4">{t("reviews.title")}</Text>
      <XStack gap="$2">
        {[1, 2, 3, 4, 5].map((value) => (
          <XStack key={value} onPress={() => setStars(value)} role="button" aria-label={t("reviews.starLabel", { count: value })}>
            <Ionicons name={value <= stars ? "star" : "star-outline"} size={32} color="#4F8266" />
          </XStack>
        ))}
      </XStack>
      <Input
        placeholder={t("reviews.placeholder")}
        accessibilityLabel={t("reviews.placeholder")}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: "top" }}
      />
      {error ? (
        <Text variant="small" color="$danger">
          {error}
        </Text>
      ) : null}
      <Button onPress={onSubmit} loading={createReview.isPending} disabled={stars === 0} fullWidth>
        {t("reviews.submit")}
      </Button>
    </YStack>
  );
}
