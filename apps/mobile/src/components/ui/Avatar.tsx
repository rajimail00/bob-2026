import { Image } from "react-native";
import { YStack } from "tamagui";
import { Text } from "./Text";

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
}

/** Circular profile photo with initials fallback — used wherever a worker or client is shown by avatar. */
export function Avatar({ uri, name, size = 56 }: AvatarProps) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <YStack width={size} height={size} borderRadius={size / 2} backgroundColor="$primary" alignItems="center" justifyContent="center">
      <Text variant="h4" color="white">
        {initials || "?"}
      </Text>
    </YStack>
  );
}
