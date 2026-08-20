import { apiClient } from "@/lib/apiClient";

export interface UploadedMedia {
  url: string;
  type: "photo" | "video";
}

/**
 * Uploads a locally-captured photo/video (via expo-image-picker) to the backend,
 * which streams it to Cloudinary and returns the hosted URL.
 */
export async function uploadMedia(localUri: string, kind: "photo" | "video"): Promise<UploadedMedia> {
  const filename = localUri.split("/").pop() ?? `upload-${Date.now()}`;
  const extension = filename.includes(".") ? filename.split(".").pop() : kind === "photo" ? "jpg" : "mp4";
  const mimeType = kind === "photo" ? `image/${extension === "jpg" ? "jpeg" : extension}` : `video/${extension}`;

  const formData = new FormData();
  // React Native's fetch/FormData accepts this { uri, name, type } shape for file fields.
  formData.append(
    "file",
    { uri: localUri, name: filename, type: mimeType } as unknown as Blob
  );

  // Don't set Content-Type manually — React Native's FormData needs axios/XHR to generate
  // the multipart boundary itself; a hardcoded header here strips the boundary and the
  // upload silently fails server-side.
  const { data } = await apiClient.post<UploadedMedia>("/media", formData);
  return data;
}

export async function uploadAudio(localUri: string): Promise<{ url: string; type: "audio" | "video" }> {
  const filename = localUri.split("/").pop() ?? `voice-${Date.now()}.m4a`;
  const extension = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : "mp4";
  const mimeType = extension === "webm" ? "video/webm" : "video/mp4";

  const formData = new FormData();
  formData.append("file", { uri: localUri, name: filename, type: mimeType } as unknown as Blob);

  const { data } = await apiClient.post<{ url: string; type: "audio" | "video" }>("/media", formData);
  return data;
}
