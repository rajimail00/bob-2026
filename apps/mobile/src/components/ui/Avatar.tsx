import { useEffect, useState } from "react";
import { Image } from "react-native";
import { YStack } from "tamagui";
import { Text } from "./Text";

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name, size = 56 }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  if (uri && !imageFailed) {
    return (
      <Image
        source={{ uri }}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  const firstLetter = name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
    >
      <Text variant="h4" color="white">
        {firstLetter}
      </Text>
    </YStack>
  );
}