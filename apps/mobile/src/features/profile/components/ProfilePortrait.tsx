import { useEffect, useState } from "react";
import { Image } from "react-native";
import { YStack } from "tamagui";
import { Text } from "@/components/ui/Text";

interface ProfilePortraitProps {
  uri?: string;
  name?: string;
  size?: number;
}

export function ProfilePortrait({ uri, name, size = 96 }: ProfilePortraitProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  return (
    <YStack
      width={size}
      height={size}
      borderRadius="$md"
      borderWidth={1}
      borderColor="$primary"
      backgroundColor="$brand100"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={{ width: size - 2, height: size - 2 }}
        />
      ) : (
        <Text variant="h2" color="$primary">
          {name?.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      )}
    </YStack>
  );
}
