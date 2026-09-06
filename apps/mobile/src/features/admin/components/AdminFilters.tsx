import { ScrollView } from "react-native";
import { Button } from "@/components/ui/Button";

export function AdminFilters<T extends string>({ values, selected, labels, onSelect }: { values: readonly T[]; selected?: T; labels: Record<T, string>; onSelect: (value?: T) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>{values.map((value) => <Button key={value} size="sm" variant={selected === value ? "primary" : "outline"} onPress={() => onSelect(selected === value ? undefined : value)}>{labels[value]}</Button>)}</ScrollView>;
}
