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
      <MapView style={{ flex: 1 }} initialRegion={initialRegion} onPress={() => setSelectedJobId(null)}>
        {jobs.map((job) => (
          <Marker
            key={job._id}
            coordinate={{ latitude: job.location.coordinates[1], longitude: job.location.coordinates[0] }}
            onPress={() => setSelectedJobId(job._id)}
            anchor={{ x: 0.5, y: 0.5 }}
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
  return (
    <YStack width={52} height={52} alignItems="center" justifyContent="center">
      <YStack
        width={isSelected ? 46 : 40}
        height={isSelected ? 46 : 40}
        borderRadius={isSelected ? 23 : 12}
        backgroundColor={isSelected ? "$tan500" : "$primary"}
        alignItems="center"
        justifyContent="center"
        borderWidth={2}
        borderColor="$backgroundStrong"
        shadowColor="#000"
        shadowOpacity={0.2}
        shadowRadius={3}
      >
        <Ionicons name={iconName} size={isSelected ? 24 : 20} color="white" />
      </YStack>
    </YStack>
  );
}
