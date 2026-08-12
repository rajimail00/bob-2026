import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import MapView, { Marker, type Region } from "react-native-maps";
import { YStack } from "tamagui";
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
          >
            <CategoryPin iconName={getCategoryIcon(job.categoryId.slug)} isSelected={job._id === selectedJobId} />
          </Marker>
        ))}
      </MapView>

      {selectedJob ? (
        <YStack position="absolute" left="$3" right="$3" bottom="$3">
          <JobCard job={selectedJob} onPress={() => onSelectJob(selectedJob)} />
        </YStack>
      ) : null}
    </YStack>
  );
}

function CategoryPin({ iconName, isSelected }: { iconName: keyof typeof Ionicons.glyphMap; isSelected: boolean }) {
  return (
    <YStack
      width={isSelected ? 40 : 34}
      height={isSelected ? 40 : 34}
      borderRadius={isSelected ? 20 : 10}
      backgroundColor={isSelected ? "$tan500" : "$primary"}
      alignItems="center"
      justifyContent="center"
      borderWidth={2}
      borderColor="$backgroundStrong"
    >
      <Ionicons name={iconName} size={isSelected ? 20 : 16} color="white" />
    </YStack>
  );
}
