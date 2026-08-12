import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import type { Application } from "../types/application.types";

interface ApplicantCardProps {
  application: Application;
  onSelect: () => void;
  isSelecting: boolean;
  disabled: boolean;
}

export function ApplicantCard({ application, onSelect, isSelecting, disabled }: ApplicantCardProps) {
  const worker = application.workerId;

  return (
    <Card gap="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack>
          <Text variant="h4">
            {worker.firstName} {worker.lastName}
          </Text>
          <Text variant="caption">
            {(worker.rating?.average ?? 0).toFixed(1)} / 5 · {worker.rating?.count ?? 0} reviews
          </Text>
        </YStack>
        {application.status !== "pending" ? (
          <StatusPill
            label={application.status === "selected" ? "Selected" : "Not selected"}
            tone={application.status === "selected" ? "brand" : "neutral"}
          />
        ) : null}
      </XStack>

      <Text variant="body">{application.message}</Text>

      {application.status === "pending" ? (
        <Button variant="outline" onPress={onSelect} loading={isSelecting} disabled={disabled}>
          Select
        </Button>
      ) : null}
    </Card>
  );
}
