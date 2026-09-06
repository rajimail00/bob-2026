import { Pressable } from "react-native";
import { XStack, YStack } from "tamagui";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { Metric } from "../types/admin.types";

function MiniTrend({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return <XStack height={38} alignItems="flex-end" gap={2}>{values.length ? values.slice(-12).map((value, index) => <YStack key={index} width={5} minHeight={3} height={Math.max(3, (value / max) * 36)} borderRadius="$pill" backgroundColor="$primary" opacity={0.35 + index / Math.max(values.length * 1.8, 1)} />) : <Text variant="caption">—</Text>}</XStack>;
}

export function AdminMetricCard({ label, metric, suffix, onPress }: { label: string; metric: Metric; suffix?: string; onPress?: () => void }) {
  const comparison = metric.comparison;
  return (
    <Pressable onPress={onPress} disabled={!onPress} role={onPress ? "button" : undefined} aria-label={label} style={{ width: "48%" }}>
      <Card elevated minHeight={158} justifyContent="space-between">
        <Text variant="small" color="$brand700" fontWeight="600">{label}</Text>
        <MiniTrend values={metric.series.map((point) => point.value)} />
        <Text variant="h3">{metric.value === null ? "—" : `${metric.value.toLocaleString()}${suffix ?? ""}`}</Text>
        <Text variant="caption" color={comparison !== null && comparison < 0 ? "$danger" : "$primary"}>{comparison === null ? "—" : `${comparison >= 0 ? "↑" : "↓"} ${Math.abs(comparison)}%`}</Text>
      </Card>
    </Pressable>
  );
}
