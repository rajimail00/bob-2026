import { useState } from "react";
import { YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useApplyToJob } from "../hooks/useApplications";

interface ApplyFormProps {
  jobId: string;
  onApplied: () => void;
}

export function ApplyForm({ jobId, onApplied }: ApplyFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const apply = useApplyToJob(jobId);

  const onSubmit = async () => {
    setError(null);
    try {
      await apply.mutateAsync({ message });
      onApplied();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't submit your application. Please try again."));
    }
  };

  return (
    <YStack gap="$3">
      <Input
        placeholder="Tell them why you're a good fit…"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
        style={{ height: 90, textAlignVertical: "top" }}
      />
      {error ? (
        <Text variant="small" color="$danger">
          {error}
        </Text>
      ) : null}
      <Button onPress={onSubmit} loading={apply.isPending} disabled={message.trim().length === 0} fullWidth>
        Apply
      </Button>
    </YStack>
  );
}
