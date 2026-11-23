import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import MapView, { Circle, Marker, type Region } from "react-native-maps";
import { XStack, YStack } from "tamagui";
import { getCategoryMarkerImage } from "../constants/categoryMarkerImages";
import type { Job } from "../types/job.types";
import { JobCard } from "./JobCard";

interface JobMapViewProps {
  jobs: Job[];
  userCoords: { lat: number; lng: number } | null;
  searchedCoords: { lat: number; lng: number } | null;
  radiusKm: number;
  onSelectJob: (job: Job) => void;
}

const DEFAULT_MAP_REGION: Region = {
  latitude: 51.1657,
  longitude: 10.4515,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

function regionForLocation(coords: { lat: number; lng: number }): Region {
  return {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}

export function JobMapView({ jobs, userCoords, searchedCoords, radiusKm, onSelectJob }: JobMapViewProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const initialRegion: Region = useMemo(() => {
    if (userCoords) {
      return regionForLocation(userCoords);
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

  useEffect(() => {
    if (!userCoords) return;
    mapRef.current?.animateToRegion(regionForLocation(userCoords), 350);
  }, [userCoords]);

  const selectedJob = jobs.find((j) => j._id === selectedJobId) ?? null;

  return (
    <YStack flex={1} position="relative">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onPress={() => setSelectedJobId(null)}
        toolbarEnabled={false}
      >
        {userCoords ? (
          <Circle
            center={{ latitude: userCoords.lat, longitude: userCoords.lng }}
            radius={radiusKm * 1000}
            fillColor="rgba(79, 130, 102, 0.14)"
            strokeColor="rgba(79, 130, 102, 0.78)"
            strokeWidth={2}
            zIndex={1}
          />
        ) : null}
        {searchedCoords ? (
          <Marker
            coordinate={{ latitude: searchedCoords.lat, longitude: searchedCoords.lng }}
            accessibilityLabel={t("locationPicker.selected")}
            zIndex={3}
          />
        ) : null}
        {jobs.map((job) => {
          const isSelected = job._id === selectedJobId;

          return (
            <Marker
              key={job._id}
              coordinate={{ latitude: job.location.coordinates[1], longitude: job.location.coordinates[0] }}
              onPress={() => setSelectedJobId(job._id)}
              image={getCategoryMarkerImage(job.categoryId.slug, isSelected)}
              anchor={{ x: 0.5, y: 0.92 }}
              zIndex={2}
            />
          );
        })}
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
