import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import MapView, { Marker, type Region } from "react-native-maps";
import { XStack, YStack } from "tamagui";
import { getCategoryIcon } from "../constants/categoryIcons";
import type { Job } from "../types/job.types";
import { JobCard } from "./JobCard";

interface JobMapViewProps {
  jobs: Job[];
  userCoords: { lat: number; lng: number } | null;
  onSelectJob: (job: Job) => void;
}

export function JobMapView({ jobs, userCoords, onSelectJob }: JobMapViewProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const initialRegion: Region = useMemo(() => {
    const center = userCoords ?? { lat: jobs[0]?.location.coordinates[1] ?? 0, lng: jobs[0]?.location.coordinates[0] ?? 0 };
    return { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }, [userCoords, jobs]);

  const selectedJob = jobs.find((j) => j._id === selectedJobId) ?? null;

  return (
    <YStack flex={1} position="relative">
      <MapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onPress={() => setSelectedJobId(null)}
        toolbarEnabled={false}
      >
        {jobs.map((job) => (
          <Marker
            key={job._id}
            coordinate={{ latitude: job.location.coordinates[1], longitude: job.location.coordinates[0] }}
            onPress={() => setSelectedJobId(job._id)}
            anchor={{ x: 0.5, y: 0.92 }}
          >
            <CategoryPin iconName={getCategoryIcon(job.categoryId.slug)} isSelected={job._id === selectedJobId} />
          </Marker>
        ))}
      </MapView>

      {selectedJob ? (
        <YStack position="absolute" left="$3" right="$3" bottom="$3">
          <YStack position="relative">
            <JobCard job={selectedJob} onPress={() => onSelectJob(selectedJob)} />
            <XStack
              position="absolute"
              top={-10}
              right={-10}
              width={28}
              height={28}
              borderRadius={14}
              backgroundColor="$backgroundStrong"
              alignItems="center"
              justifyContent="center"
              shadowColor="#000"
              shadowOpacity={0.15}
              shadowRadius={4}
              onPress={() => setSelectedJobId(null)}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <Ionicons name="close" size={16} color="#232920" />
            </XStack>
          </YStack>
        </YStack>
      ) : null}
    </YStack>
  );
}

function CategoryPin({ iconName, isSelected }: { iconName: keyof typeof Ionicons.glyphMap; isSelected: boolean }) {
  const bubbleSize = isSelected ? 56 : 48;
  const color = isSelected ? "$tan500" : "$primary";

  return (
    <YStack width={68} height={76} alignItems="center" justifyContent="flex-start">
      <YStack
        width={bubbleSize}
        height={bubbleSize}
        borderRadius={bubbleSize / 2}
        backgroundColor={color}
        alignItems="center"
        justifyContent="center"
        borderWidth={3}
        borderColor="$backgroundStrong"
        shadowColor="#000"
        shadowOpacity={0.25}
        shadowRadius={4}
        shadowOffset={{ width: 0, height: 2 }}
      >
        <Ionicons name={iconName} size={isSelected ? 28 : 24} color="white" />
      </YStack>
      <YStack
        width={14}
        height={14}
        marginTop={-8}
        backgroundColor={color}
        borderBottomWidth={3}
        borderRightWidth={3}
        borderColor="$backgroundStrong"
        style={{ transform: [{ rotate: "45deg" }] }}
      />
    </YStack>
  );
}
