import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { XStack, YStack } from "tamagui";
import { getCategoryMarkerImage } from "../constants/categoryMarkerImages";
import type { Job } from "../types/job.types";
import { JobCard } from "./JobCard";

interface JobMapViewProps {
  jobs: Job[];
  userCoords: { lat: number; lng: number } | null;
  onSelectJob: (job: Job) => void;
}

const DEFAULT_MAP_REGION: Region = {
  latitude: 51.1657,
  longitude: 10.4515,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

export function JobMapView({ jobs, userCoords, onSelectJob }: JobMapViewProps) {
  const { t } = useTranslation();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const initialRegion: Region = useMemo(() => {
    if (userCoords) {
      return { latitude: userCoords.lat, longitude: userCoords.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }

    const firstJob = jobs[0];
    if (firstJob) {
      return {
        latitude: firstJob.location.coordinates[1],
        longitude: firstJob.location.coordinates[0],
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    return DEFAULT_MAP_REGION;
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
        {jobs.map((job) => {
          const isSelected = job._id === selectedJobId;

          return (
            <Marker
              key={job._id}
              coordinate={{ latitude: job.location.coordinates[1], longitude: job.location.coordinates[0] }}
              onPress={() => setSelectedJobId(job._id)}
              image={getCategoryMarkerImage(job.categoryId.slug, isSelected)}
              anchor={{ x: 0.5, y: 0.92 }}
            />
          );
        })}
      </MapView>

      {selectedJob ? (
        <Pressable
          onPress={() => setSelectedJobId(null)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          accessibilityRole="button"
          accessibilityLabel={t("filters.closePreview")}
        >
          <BlurView intensity={35} tint="dark" style={{ flex: 1 }} />
        </Pressable>
      ) : null}

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
              accessibilityLabel={t("filters.closePreview")}
            >
              <Ionicons name="close" size={16} color="#232920" />
            </XStack>
          </YStack>
        </YStack>
      ) : null}
    </YStack>
  );
}
