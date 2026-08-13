import { useState } from "react";
import { Dimensions, ScrollView, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { XStack, YStack } from "tamagui";
import { ApplicantCard } from "./ApplicantCard";
import type { Application } from "../types/application.types";

interface ApplicantCarouselProps {
  applicants: Application[];
  onOffer: (applicationId: string) => void;
  onMessage: (workerId: string) => void;
  isOffering: boolean;
}

/** Swipeable, one-candidate-at-a-time view of a job's applicants — mirrors the media carousel
 * so browsing applicants feels consistent with browsing job photos. */
export function ApplicantCarousel({ applicants, onOffer, onMessage, isOffering }: ApplicantCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const width = Dimensions.get("window").width - 32;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <YStack gap="$2">
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {applicants.map((application) => (
          <YStack key={application._id} width={width}>
            <ApplicantCard
              application={application}
              onOffer={() => onOffer(application._id)}
              onMessage={() => onMessage(application.workerId._id)}
              isOffering={isOffering}
              disabled={isOffering}
            />
          </YStack>
        ))}
      </ScrollView>

      {applicants.length > 1 ? (
        <XStack gap="$2" justifyContent="center">
          {applicants.map((application, index) => (
            <YStack
              key={application._id}
              width={6}
              height={6}
              borderRadius={3}
              backgroundColor={index === activeIndex ? "$primary" : "$neutral200"}
            />
          ))}
        </XStack>
      ) : null}
    </YStack>
  );
}
