import Constants, { ExecutionEnvironment } from "expo-constants";
import { getInfoAsync } from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";

const MAX_IMAGE_EDGE = 1600;
const IMAGE_QUALITY = 0.72;
// Keep a 30-second job video comfortably below the API's 10 MB ceiling.
// The compressor's automatic bitrate profile targets roughly 0.7-1.2 Mbps at
// 720p, which also makes uploads practical on a mobile connection.
const MAX_VIDEO_EDGE = 720;

export interface PreparedMedia {
  uri: string;
  fileSize: number;
  name: string;
  mimeType: string;
}

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    || Constants.appOwnership === "expo";
}

async function getFileSize(uri: string, fallback?: number): Promise<number> {
  const info = await getInfoAsync(uri);
  if (info.exists && typeof info.size === "number") {
    return info.size;
  }
  if (typeof fallback === "number") {
    return fallback;
  }
  throw new Error("Unable to determine the selected media file size.");
}

export async function compressMedia(
  asset: ImagePickerAsset,
  kind: "photo" | "video"
): Promise<PreparedMedia> {
  if (kind === "photo") {
    const largestEdge = Math.max(asset.width || 0, asset.height || 0);
    const actions = largestEdge > MAX_IMAGE_EDGE
      ? [{ resize: asset.width >= asset.height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE } }]
      : [];
    const result = await manipulateAsync(asset.uri, actions, {
      compress: IMAGE_QUALITY,
      format: SaveFormat.JPEG,
    });
    return {
      uri: result.uri,
      fileSize: await getFileSize(result.uri),
      name: `bob-photo-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
    };
  }

  // Expo Go cannot load custom native modules. Preserve the chosen video in
  // that environment so the picker can accept files already under the API
  // limit and reject oversized files. Native builds retain full compression.
  if (isExpoGo()) {
    return {
      uri: asset.uri,
      fileSize: await getFileSize(asset.uri, asset.fileSize),
      name: `bob-video-${Date.now()}.mp4`,
      mimeType: asset.mimeType || "video/mp4",
    };
  }

  const { Video, getVideoMetaData } = require("react-native-compressor") as typeof import("react-native-compressor");
  const uri = await Video.compress(asset.uri, {
    compressionMethod: "auto",
    maxSize: MAX_VIDEO_EDGE,
    minimumFileSizeForCompress: 0,
  });
  const metadata = await getVideoMetaData(uri);
  return {
    uri,
    fileSize: metadata.size,
    name: `bob-video-${Date.now()}.mp4`,
    mimeType: "video/mp4",
  };
}
